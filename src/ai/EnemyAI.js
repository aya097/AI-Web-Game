import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class EnemyAI {
    constructor({ owner = null, target = null, world = null, profile = {}, boundaryRadius = null } = {}) {
        this.owner = owner;
        this.target = target;
        this.world = world;
        this.boundaryRadius = boundaryRadius;
        this.chaseDistance = profile.chaseDistance ?? 400;
        this.attackDistance = profile.attackDistance ?? 260;
        this.attackAngle = THREE.MathUtils.degToRad(profile.attackAngleDeg ?? 18);
        this.standoffDistance = profile.standoffDistance ?? 240;
        this.standoffBand = profile.standoffBand ?? 40;
        this.holdDuration = profile.holdDuration ?? 4.5;
        this.burstDuration = profile.burstDuration ?? 1.0;
        this.state = "patrol";
        this._prevState = "patrol";
        this._patrolTimer = 0;
        this._patrolDir = new THREE.Vector3(0.3, 0.1, 1).normalize();
        this._holdTimer = 0;
        this._moveBurstTimer = 0;
        this._strafeTimer = 0;
        this._strafeDir = 1;
    }

    setTarget(target) {
        this.target = target;
    }

    _selectTarget() {
        if (!this.world) return this.target;
        const ownerPos = this.owner?.group?.getWorldPosition(new THREE.Vector3());
        if (!ownerPos) return this.target;

        const allies = this.world.query().filter((entity) => {
            if (!entity?.group || entity === this.owner) return false;
            const isAlly = entity.team === "ally" || entity.isAlly;
            if (!isAlly) return false;
            if (typeof entity.hp === "number" && entity.hp <= 0) return false;
            return true;
        });
        if (!allies.length) return this.target;

        const engageRadius = Math.max(this.attackDistance * 1.6, 240);
        const emergencyRadius = Math.max(120, this.standoffDistance * 0.6);
        let best = null;
        let bestDist = Infinity;

        allies.forEach((entity) => {
            const dist = ownerPos.distanceTo(entity.group.getWorldPosition(new THREE.Vector3()));
            if (dist <= emergencyRadius && dist < bestDist) {
                bestDist = dist;
                best = entity;
            }
        });
        if (best) return best;

        allies.forEach((entity) => {
            if (!entity.isBattleship) return;
            const dist = ownerPos.distanceTo(entity.group.getWorldPosition(new THREE.Vector3()));
            if (dist < bestDist) {
                bestDist = dist;
                best = entity;
            }
        });
        if (best) return best;

        allies.forEach((entity) => {
            const dist = ownerPos.distanceTo(entity.group.getWorldPosition(new THREE.Vector3()));
            if (dist <= engageRadius && dist < bestDist) {
                bestDist = dist;
                best = entity;
            }
        });
        if (best) return best;

        allies.forEach((entity) => {
            const dist = ownerPos.distanceTo(entity.group.getWorldPosition(new THREE.Vector3()));
            if (dist < bestDist) {
                bestDist = dist;
                best = entity;
            }
        });
        return best || this.target;
    }

    update(dt = 0) {
        if (!this.owner?.group) {
            return { move: { forward: 0, right: 0, up: 0 }, fire: false, desiredDirection: null };
        }

        const forwardAxis = this.owner?.fireForward || new THREE.Vector3(0, 0, 1);
        const forwardSignRaw = forwardAxis.clone().normalize().dot(new THREE.Vector3(0, 0, 1));
        const forwardSign = Math.abs(forwardSignRaw) < 0.01 ? 1 : Math.sign(forwardSignRaw);

        if (this.world) {
            this.target = this._selectTarget();
        }

        const ownerPos = this.owner.group.getWorldPosition(new THREE.Vector3());
        if (this.boundaryRadius && ownerPos.length() > this.boundaryRadius) {
            const centerDir = ownerPos.clone().multiplyScalar(-1).normalize();
            return { move: { forward: 0.9 * forwardSign, right: 0, up: 0 }, fire: false, desiredDirection: centerDir };
        }

        if (!this.target?.group) {
            return { move: { forward: 0, right: 0, up: 0 }, fire: false, desiredDirection: null };
        }

        const targetPos = this.target.group.getWorldPosition(new THREE.Vector3());
        const toTarget = targetPos.sub(ownerPos);
        const distance = toTarget.length();
        const direction = toTarget.normalize();

        const forward = forwardAxis.clone().applyQuaternion(this.owner.group.quaternion).normalize();
        const angle = Math.acos(THREE.MathUtils.clamp(forward.dot(direction), -1, 1));

        if (this.target?.isBattleship) {
            if (distance > this.standoffDistance + this.standoffBand) {
                this.state = "chase";
            } else {
                this.state = "attack";
            }
        } else if (distance > this.chaseDistance) {
            this.state = "patrol";
        } else if (distance > this.standoffDistance + this.standoffBand) {
            this.state = "chase";
        } else {
            this.state = "attack";
        }

        if (this.state !== this._prevState) {
            this._holdTimer = 0;
            this._moveBurstTimer = 0;
            this._prevState = this.state;
        }

        if (this.state === "patrol") {
            this._patrolTimer -= dt;
            if (this._patrolTimer <= 0) {
                this._patrolTimer = 2.5 + Math.random() * 2.0;
                this._patrolDir
                    .set(Math.random() - 0.5, Math.random() - 0.5, 1)
                    .normalize();
            }
            return { move: { forward: 0.4 * forwardSign, right: 0, up: 0 }, fire: false, desiredDirection: this._patrolDir };
        }

        if (this.state === "chase") {
            this._holdTimer -= dt;
            this._moveBurstTimer = Math.max(0, this._moveBurstTimer - dt);
            if (this._holdTimer <= 0) {
                this._holdTimer = this.holdDuration;
                this._moveBurstTimer = this.burstDuration;
            }
            const move = this._moveBurstTimer > 0 ? { forward: 0.85 * forwardSign, right: 0, up: 0 } : { forward: 0, right: 0, up: 0 };
            return { move, fire: false, desiredDirection: direction };
        }

        const move = { forward: 0, right: 0, up: 0 };
        this._holdTimer -= dt;
        this._moveBurstTimer = Math.max(0, this._moveBurstTimer - dt);
        if (this._holdTimer <= 0) {
            this._holdTimer = this.holdDuration;
            this._moveBurstTimer = this.burstDuration;
        }
        const isMoving = this._moveBurstTimer > 0;
        if (this._moveBurstTimer > 0) {
            if (distance < this.standoffDistance - this.standoffBand) {
                move.forward = -0.4 * forwardSign;
            } else if (distance > this.standoffDistance + this.standoffBand) {
                move.forward = 0.55 * forwardSign;
            }
        }
        const fire = distance < this.attackDistance && angle < this.attackAngle;
        const desiredDirection = !isMoving ? direction : null;
        return { move, fire, desiredDirection };
    }
}
