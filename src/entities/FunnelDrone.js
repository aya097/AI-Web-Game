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
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), bodyMaterial);
        this.group.add(core);

        const shellMaterial = new THREE.MeshStandardMaterial({
            color: 0xd7f3ff,
            emissive: 0x5ad1ff,
            emissiveIntensity: 0.8,
            metalness: 0.4,
            roughness: 0.3,
        });
        const shell = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 16), shellMaterial);
        shell.rotation.x = Math.PI / 2;
        shell.position.set(0, 0, 0.15);
        this.group.add(shell);

        const finMaterial = new THREE.MeshStandardMaterial({
            color: 0x8fd4ff,
            emissive: 0x2a6bff,
            emissiveIntensity: 0.7,
            metalness: 0.2,
            roughness: 0.4,
        });
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.6), finMaterial);
        fin.position.set(0, 0.08, -0.1);
        this.group.add(fin);
        const fin2 = fin.clone();
        fin2.rotation.y = Math.PI / 2;
        this.group.add(fin2);

        const glowRing = new THREE.Mesh(
            new THREE.RingGeometry(0.18, 0.28, 16),
            new THREE.MeshStandardMaterial({
                color: 0x7fe3ff,
                emissive: 0x58d0ff,
                emissiveIntensity: 1.4,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            })
        );
        glowRing.rotation.x = Math.PI / 2;
        glowRing.position.set(0, 0, -0.25);
        this.group.add(glowRing);

        this.trailSegments = [];
        this._trailAges = [];
        this._trailTimer = 0;
        this._trailInterval = 0.02;
        this._trailMaxAge = 0.7;
        this._trailIndex = 0;

        const trailMaterial = new THREE.MeshStandardMaterial({
            color: 0x7fe3ff,
            emissive: 0x58d0ff,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        for (let i = 0; i < 24; i += 1) {
            const segment = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), trailMaterial.clone());
            segment.visible = false;
            this.trailSegments.push(segment);
            this._trailAges.push(this._trailMaxAge);
            if (scene) scene.add(segment);
        }

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
        this._lastPosition = new THREE.Vector3();

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
        if (this._lastPosition.lengthSq() === 0) {
            this._lastPosition.copy(this.group.position);
        }
        if (this.mode === "orbit" && this.targetPosition) {
            this.group.lookAt(this.targetPosition);
        }
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
            this._trailTimer = 0;
            this._hideTrail();
            return;
        }

        if (this.mode === "return") {
            this.group.position.lerp(this.homePosition, 1 - Math.exp(-this.returnSpeed * dt));
            this.group.lookAt(this.homePosition);
            this._updateTrail(dt);
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
            this._updateTrail(dt);
        }
    }

    _hideTrail() {
        this.trailSegments.forEach((segment, index) => {
            segment.visible = false;
            this._trailAges[index] = this._trailMaxAge;
            segment.material.opacity = 0;
        });
    }

    _updateTrail(dt) {
        this._trailTimer += dt;
        if (this._trailTimer >= this._trailInterval) {
            this._trailTimer = 0;
            const segment = this.trailSegments[this._trailIndex];
            segment.visible = true;
            segment.position.copy(this.group.position);
            segment.scale.setScalar(1);
            this._trailAges[this._trailIndex] = 0;
            this._trailIndex = (this._trailIndex + 1) % this.trailSegments.length;
        }

        this.trailSegments.forEach((segment, index) => {
            this._trailAges[index] += dt;
            const age = this._trailAges[index];
            const t = Math.min(1, age / this._trailMaxAge);
            const opacity = (1 - t) * 0.8;
            if (opacity <= 0.01) {
                segment.visible = false;
                segment.material.opacity = 0;
                return;
            }
            segment.material.opacity = opacity;
            segment.scale.setScalar(1 + t * 0.6);
        });
    }
}
