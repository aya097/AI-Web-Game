import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class FunnelDrone {
    constructor({ scene, color = 0x6cc5ff, emissive = 0x1e5b7a } = {}) {
        this.group = new THREE.Group();
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 1.0,
            metalness: 0.2,
            roughness: 0.4,
        });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), bodyMaterial);
        this.group.add(body);

        const beamMaterial = new THREE.MeshStandardMaterial({
            color: 0x7fe3ff,
            emissive: 0x58d0ff,
            emissiveIntensity: 1.3,
            transparent: true,
            opacity: 0.75,
        });
        this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6, 1, true), beamMaterial);
        this.beam.visible = false;

        this.mode = "dock";
        this.homePosition = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        this.orbitAngle = 0;
        this.orbitRadius = 0;
        this.orbitHeight = 0;
        this.lerpSpeed = 5;
        this.returnSpeed = 6;
        this._beamTimer = 0;
        this._beamOrigin = new THREE.Vector3();
        this._beamTarget = new THREE.Vector3();

        if (scene) {
            scene.add(this.group);
            scene.add(this.beam);
        }
    }

    setHomePosition(position) {
        this.homePosition.copy(position);
    }

    setTargetPosition(position) {
        this.targetPosition.copy(position);
    }

    setOrbit({ angle, radius, height, lerpSpeed, returnSpeed }) {
        this.orbitAngle = angle;
        this.orbitRadius = radius;
        this.orbitHeight = height;
        if (lerpSpeed) this.lerpSpeed = lerpSpeed;
        if (returnSpeed) this.returnSpeed = returnSpeed;
    }

    setMode(mode) {
        this.mode = mode;
    }

    fireAt(origin, target, duration) {
        this._beamOrigin.copy(origin);
        this._beamTarget.copy(target);
        this._beamTimer = duration;
        this.beam.visible = true;
    }

    update(dt) {
        if (this._beamTimer > 0) {
            this._beamTimer = Math.max(0, this._beamTimer - dt);
            const direction = this._beamTarget.clone().sub(this._beamOrigin).normalize();
            const length = this._beamOrigin.distanceTo(this._beamTarget);
            this.beam.scale.set(1, length, 1);
            this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
            this.beam.position.copy(this._beamOrigin).add(direction.multiplyScalar(length * 0.5));
            if (this._beamTimer === 0) {
                this.beam.visible = false;
            }
        }

        if (this.mode === "dock") {
            this.group.position.lerp(this.homePosition, 1 - Math.exp(-this.lerpSpeed * dt));
            return;
        }

        if (this.mode === "return") {
            this.group.position.lerp(this.homePosition, 1 - Math.exp(-this.returnSpeed * dt));
            if (this.group.position.distanceTo(this.homePosition) < 0.4) {
                this.mode = "dock";
            }
            return;
        }

        if (this.mode === "orbit") {
            const orbitOffset = new THREE.Vector3(
                Math.cos(this.orbitAngle),
                Math.sin(this.orbitAngle * 0.7) * this.orbitHeight,
                Math.sin(this.orbitAngle)
            ).multiplyScalar(this.orbitRadius);
            orbitOffset.y += this.orbitHeight;
            const desired = this.targetPosition.clone().add(orbitOffset);
            this.group.position.lerp(desired, 1 - Math.exp(-this.lerpSpeed * dt));
        }
    }
}
