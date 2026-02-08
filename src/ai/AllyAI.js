import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class AllyAI {
    constructor({ owner = null, world = null, profile = {}, battleships = [] } = {}) {
        this.owner = owner;
        this.world = world;
        this.battleships = battleships;
        this.chaseDistance = profile.chaseDistance ?? 420;
        this.attackDistance = profile.attackDistance ?? 260;
        this.attackAngle = THREE.MathUtils.degToRad(profile.attackAngleDeg ?? 18);
        this.standoffDistance = profile.standoffDistance ?? 220;
        this.standoffBand = profile.standoffBand ?? 40;
        this.holdDuration = profile.holdDuration ?? 4.0;
        this.burstDuration = profile.burstDuration ?? 1.0;
        this.state = "patrol";
        this._prevState = "patrol";
        this._patrolTimer = 0;
        this._patrolDir = new THREE.Vector3(0.2, 0.1, 1).normalize();
        this._holdTimer = 0;
        this._moveBurstTimer = 0;
    }

    _selectTarget() {
        if (!this.world) return null;
        const ownerPos = this.owner?.group?.getWorldPosition(new THREE.Vector3());
        if (!ownerPos) return null;

        const enemies = this.world.query().filter((entity) => {
            if (!entity?.group || entity === this.owner) return false;
            const isEnemy = entity.team === "enemy" || entity.isEnemy;
            if (!isEnemy) return false;
            if (typeof entity.hp === "number" && entity.hp <= 0) return false;
            return true;
        });

        if (!enemies.length) return null;

        const engageRadius = Math.max(this.attackDistance * 1.6, 240);
        const emergencyRadius = Math.max(120, this.standoffDistance * 0.6);
        let best = null;
        let bestDist = Infinity;

        enemies.forEach((entity) => {
            const dist = ownerPos.distanceTo(entity.group.getWorldPosition(new THREE.Vector3()));
            if (dist <= emergencyRadius && dist < bestDist) {
                bestDist = dist;
                best = entity;
            }
        });

        if (best) return best;

        enemies.forEach((entity) => {
            if (!entity.isBattleship) return;
            const dist = ownerPos.distanceTo(entity.group.getWorldPosition(new THREE.Vector3()));
            if (dist < bestDist) {
                bestDist = dist;
                best = entity;
            }
        });

        if (best) return best;

        enemies.forEach((entity) => {
            const dist = ownerPos.distanceTo(entity.group.getWorldPosition(new THREE.Vector3()));
            if (dist <= engageRadius && dist < bestDist) {
                bestDist = dist;
                best = entity;
            }
        });

        if (best) return best;

        enemies.forEach((entity) => {
            const dist = ownerPos.distanceTo(entity.group.getWorldPosition(new THREE.Vector3()));
            if (dist < bestDist) {
                bestDist = dist;
                best = entity;
            }
        });
        return best;
    }

    update(dt = 0) {
        if (!this.owner?.group) {
            return { move: { forward: 0, right: 0, up: 0 }, fire: false, desiredDirection: null };
        }

        const forwardAxis = this.owner?.fireForward || new THREE.Vector3(0, 0, 1);
        const forwardSignRaw = forwardAxis.clone().normalize().dot(new THREE.Vector3(0, 0, 1));
        const forwardSign = Math.abs(forwardSignRaw) < 0.01 ? 1 : Math.sign(forwardSignRaw);

        const target = this._selectTarget();
        if (!target?.group) {
            this.state = "patrol";
            this._patrolTimer -= dt;
            if (this._patrolTimer <= 0) {
                this._patrolTimer = 2.5 + Math.random() * 2.0;
                this._patrolDir.set(Math.random() - 0.5, Math.random() - 0.5, 1).normalize();
            }
            return { move: { forward: 0.35 * forwardSign, right: 0, up: 0 }, fire: false, desiredDirection: this._patrolDir };
        }

        const ownerPos = this.owner.group.getWorldPosition(new THREE.Vector3());
        const targetPos = target.group.getWorldPosition(new THREE.Vector3());
        const toTarget = targetPos.sub(ownerPos);
        const distance = toTarget.length();
        const direction = toTarget.normalize();

        const forward = forwardAxis.clone().applyQuaternion(this.owner.group.quaternion).normalize();
        const angle = Math.acos(THREE.MathUtils.clamp(forward.dot(direction), -1, 1));

        if (distance > this.chaseDistance) {
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
                move.forward = 0.5 * forwardSign;
            }
        }
        const fire = distance < this.attackDistance && angle < this.attackAngle;
        const desiredDirection = !isMoving ? direction : null;
        return { move, fire, desiredDirection };
    }
}
