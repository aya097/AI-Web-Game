import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class LaserWeapon {
    constructor({
        owner = null,
        world = null,
        scene = null,
        damage = 10,
        range = 500,
        fireRate = 4,
        beamColor = 0xff9f9f,
        beamEmissive = 0xff4f4f,
        beamRadius = 0.06,
        beamDuration = 0.12,
        muzzleOffset = null,
        getMuzzleWorldPosition = null,
        getAimDirection = null,
        inputKey = null,
        recoilKick = 0.2,
        onFire = null,
    } = {}) {
        this.owner = owner;
        this.world = world;
        this.scene = scene;
        this.damage = damage;
        this.range = range;
        this.fireRate = fireRate;
        this.beamColor = beamColor;
        this.beamEmissive = beamEmissive;
        this.beamRadius = beamRadius;
        this.beamDuration = beamDuration;
        this.muzzleOffset = muzzleOffset;
        this.getMuzzleWorldPosition = getMuzzleWorldPosition;
        this.getAimDirection = getAimDirection;
        this.inputKey = inputKey;
        this.recoilKick = recoilKick;
        this.onFire = onFire;
        this._cooldown = 0;
        this._isFiring = false;
        this._beamTimer = 0;
        this._beamLength = 0;
        this._flashTimer = 0;
        this._flashMesh = null;
        this._glowMesh = null;
        this._impactMesh = null;
        this._impactTimer = 0;

        this._beamMesh = null;
        if (this.scene) {
            const beamGeometry = new THREE.CylinderGeometry(this.beamRadius, this.beamRadius, 1, 8, 1, true);
            const beamMaterial = new THREE.MeshStandardMaterial({
                color: this.beamColor,
                emissive: this.beamEmissive,
                emissiveIntensity: 2.0,
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            this._beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
            this._beamMesh.visible = false;
            this.scene.add(this._beamMesh);

            const glowGeometry = new THREE.CylinderGeometry(this.beamRadius * 2.2, this.beamRadius * 2.2, 1, 10, 1, true);
            const glowMaterial = new THREE.MeshStandardMaterial({
                color: this.beamColor,
                emissive: this.beamEmissive,
                emissiveIntensity: 1.6,
                transparent: true,
                opacity: 0.35,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            this._glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
            this._glowMesh.visible = false;
            this.scene.add(this._glowMesh);

            const flashGeometry = new THREE.SphereGeometry(0.18, 12, 12);
            const flashMaterial = new THREE.MeshStandardMaterial({
                color: this.beamColor,
                emissive: this.beamEmissive,
                emissiveIntensity: 2.4,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            this._flashMesh = new THREE.Mesh(flashGeometry, flashMaterial);
            this._flashMesh.visible = false;
            this.scene.add(this._flashMesh);

            const impactGeometry = new THREE.RingGeometry(0.15, 0.35, 24);
            const impactMaterial = new THREE.MeshStandardMaterial({
                color: this.beamColor,
                emissive: this.beamEmissive,
                emissiveIntensity: 2.2,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            this._impactMesh = new THREE.Mesh(impactGeometry, impactMaterial);
            this._impactMesh.visible = false;
            this.scene.add(this._impactMesh);
        }
    }

    setOwner(owner) {
        this.owner = owner;
    }

    setWorld(world) {
        this.world = world;
    }

    triggerStart() {
        this._isFiring = true;
    }

    triggerEnd() {
        this._isFiring = false;
    }

    update(dt) {
        if (!this.owner || !this.world || !this.owner.group) return;

        if (this._beamTimer > 0 && this._beamMesh) {
            this._beamTimer = Math.max(0, this._beamTimer - dt);
            const t = this._beamTimer / Math.max(0.001, this.beamDuration);
            const pulse = 1 + (1 - t) * 0.5;
            this._beamMesh.scale.set(pulse, this._beamLength, pulse);
            if (this._beamMesh.material) {
                this._beamMesh.material.opacity = 0.9 * t;
            }
            if (this._glowMesh) {
                this._glowMesh.scale.set(pulse * 1.4, this._beamLength, pulse * 1.4);
                this._glowMesh.position.copy(this._beamMesh.position);
                this._glowMesh.quaternion.copy(this._beamMesh.quaternion);
                this._glowMesh.visible = true;
                this._glowMesh.material.opacity = 0.35 * t;
            }
            if (this._beamTimer === 0) {
                this._beamMesh.visible = false;
                if (this._glowMesh) this._glowMesh.visible = false;
            }
        }

        if (this._flashTimer > 0 && this._flashMesh) {
            this._flashTimer = Math.max(0, this._flashTimer - dt);
            const t = this._flashTimer / 0.08;
            this._flashMesh.visible = true;
            this._flashMesh.scale.setScalar(0.8 + (1 - t) * 1.2);
            this._flashMesh.material.opacity = 0.9 * t;
            if (this._flashTimer === 0) {
                this._flashMesh.visible = false;
            }
        }

        if (this._impactTimer > 0 && this._impactMesh) {
            this._impactTimer = Math.max(0, this._impactTimer - dt);
            const t = this._impactTimer / 0.1;
            this._impactMesh.visible = true;
            this._impactMesh.scale.setScalar(1 + (1 - t) * 2.5);
            this._impactMesh.material.opacity = 0.9 * t;
            this._impactMesh.rotation.z += dt * 6.0;
            if (this._impactTimer === 0) {
                this._impactMesh.visible = false;
            }
        }

        if (this._cooldown > 0) {
            this._cooldown = Math.max(0, this._cooldown - dt);
        }

        if (!this._isFiring || this._cooldown > 0) return;

        this.fire();
        this._cooldown = 1 / this.fireRate;
    }

    fire() {
        let origin = null;
        if (typeof this.getMuzzleWorldPosition === "function") {
            origin = this.getMuzzleWorldPosition();
        }
        if (!origin) {
            origin = this.owner.group.getWorldPosition(new THREE.Vector3());
            if (this.muzzleOffset) {
                origin.add(this.muzzleOffset.clone().applyQuaternion(this.owner.group.quaternion));
            }
        }

        let forward = null;
        if (typeof this.getAimDirection === "function") {
            forward = this.getAimDirection();
        }
        if (!forward) {
            const forwardAxis = this.owner?.fireForward || new THREE.Vector3(0, 0, 1);
            forward = forwardAxis.clone().applyQuaternion(this.owner.group.quaternion).normalize();
        } else {
            forward = forward.clone().normalize();
        }
        const ray = new THREE.Ray(origin, forward);

        let hitEntity = null;
        let hitDistance = this.range;

        const candidates = typeof this.world.queryNearby === "function" ? this.world.queryNearby(origin, this.range) : this.world.query();
        candidates.forEach((entity) => {
            if (!entity?.group || entity === this.owner) return;
            if (typeof entity.colliderRadius !== "number") return;
            if (this.owner?.team && entity?.team && this.owner.team === entity.team) return;
            if (typeof entity.hp === "number" && entity.hp <= 0) return;
            const center = entity.group.getWorldPosition(new THREE.Vector3());
            const sphere = new THREE.Sphere(center, entity.colliderRadius);
            const hitPoint = ray.intersectSphere(sphere, new THREE.Vector3());
            if (!hitPoint) return;
            const distance = origin.distanceTo(hitPoint);
            if (distance < hitDistance) {
                hitDistance = distance;
                hitEntity = entity;
            }
        });

        if (this._beamMesh) {
            this._beamMesh.visible = true;
            this._beamLength = hitDistance;
            this._beamMesh.scale.set(1, hitDistance, 1);
            this._beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);
            this._beamMesh.position.copy(origin).add(forward.clone().multiplyScalar(hitDistance * 0.5));
            this._beamTimer = this.beamDuration;
        }

        if (this._glowMesh) {
            this._glowMesh.visible = true;
            this._glowMesh.scale.set(2.2, hitDistance, 2.2);
            this._glowMesh.quaternion.copy(this._beamMesh.quaternion);
            this._glowMesh.position.copy(this._beamMesh.position);
        }

        if (this._flashMesh) {
            this._flashTimer = 0.08;
            this._flashMesh.position.copy(origin);
            this._flashMesh.visible = true;
            this._flashMesh.material.opacity = 0.9;
        }

        if (this._impactMesh) {
            this._impactTimer = 0.1;
            this._impactMesh.position.copy(origin).add(forward.clone().multiplyScalar(hitDistance));
            this._impactMesh.lookAt(origin);
            this._impactMesh.visible = true;
            this._impactMesh.material.opacity = 0.9;
        }

        if (typeof this.owner?.applyRecoil === "function") {
            this.owner.applyRecoil(this.recoilKick);
        }

        const hitPoint = origin.clone().add(forward.clone().multiplyScalar(hitDistance));
        if (typeof this.onFire === "function") {
            this.onFire({ origin, hitPoint, hitEntity });
        }

        if (hitEntity?.onDamage) {
            hitEntity.onDamage(this.damage, { source: this.owner });
        }
    }

    clearVisuals() {
        this._beamTimer = 0;
        this._flashTimer = 0;
        this._impactTimer = 0;
        if (this._beamMesh) this._beamMesh.visible = false;
        if (this._glowMesh) this._glowMesh.visible = false;
        if (this._flashMesh) this._flashMesh.visible = false;
        if (this._impactMesh) this._impactMesh.visible = false;
    }

    destroy() {
        this.clearVisuals();
        if (this.scene) {
            if (this._beamMesh) this.scene.remove(this._beamMesh);
            if (this._glowMesh) this.scene.remove(this._glowMesh);
            if (this._flashMesh) this.scene.remove(this._flashMesh);
            if (this._impactMesh) this.scene.remove(this._impactMesh);
        }
        const disposeMesh = (mesh) => {
            if (!mesh) return;
            if (mesh.geometry?.dispose) mesh.geometry.dispose();
            if (mesh.material?.dispose) mesh.material.dispose();
        };
        disposeMesh(this._beamMesh);
        disposeMesh(this._glowMesh);
        disposeMesh(this._flashMesh);
        disposeMesh(this._impactMesh);
        this._beamMesh = null;
        this._glowMesh = null;
        this._flashMesh = null;
        this._impactMesh = null;
    }
}
