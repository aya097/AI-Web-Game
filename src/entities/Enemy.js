import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class Enemy {
    constructor(movement, ai, { weapons = [], type = "grunt", stats = null, events = null, team = "enemy", palette = null } = {}) {
        this.movement = movement;
        this.ai = ai;
        this.weapons = weapons;
        this.type = type;
        this.events = events;
        this.group = new THREE.Group();
        this.isTargetable = true;
        this.team = team;
        this.isEnemy = team === "enemy";
        this.isAlly = team === "ally";
        this.scoreValue = stats?.score ?? 100;
        this.colliderRadius = 1.4;
        this.fireForward = new THREE.Vector3(0, 0, -1);
        this.stunTimer = 0;
        this.stunPhase = 0;
        this._baseQuat = new THREE.Quaternion();

        const resolvedPalette = palette ?? stats?.palette ?? {};
        const bodyColor = resolvedPalette.body ?? (this.isEnemy ? 0xff3b3b : 0x5ab0ff);
        const coreColor = resolvedPalette.core ?? (this.isEnemy ? 0x3a0c0c : 0x0b2a52);
        const panelColor = resolvedPalette.panel ?? (this.isEnemy ? 0xff7a7a : 0x8fd4ff);
        const glowColor = resolvedPalette.glow ?? (this.isEnemy ? 0xff5a5a : 0x7ad7ff);

        const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.6, roughness: 0.28 });
        const coreMaterial = new THREE.MeshStandardMaterial({ color: coreColor, metalness: 0.5, roughness: 0.4 });
        const panelMaterial = new THREE.MeshStandardMaterial({ color: panelColor, metalness: 0.5, roughness: 0.32 });
        const glowMaterial = new THREE.MeshStandardMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 1.6 });

        const torso = new THREE.Mesh(new THREE.SphereGeometry(0.85, 22, 18), bodyMaterial);
        torso.scale.set(1.15, 1.35, 0.95);
        torso.position.set(0, 1.4, 0);
        this.group.add(torso);

        const chest = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 18), panelMaterial);
        chest.scale.set(1.1, 0.85, 0.9);
        chest.position.set(0, 1.6, -0.25);
        this.group.add(chest);

        const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 16), coreMaterial);
        abdomen.scale.set(1.1, 0.9, 0.9);
        abdomen.position.set(0, 0.95, -0.1);
        this.group.add(abdomen);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), coreMaterial);
        head.scale.set(1.05, 0.9, 0.95);
        head.position.set(0, 2.35, -0.1);
        this.group.add(head);

        const monoEyeRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 24), panelMaterial);
        monoEyeRing.rotation.y = Math.PI / 2;
        monoEyeRing.position.set(0, 2.3, -0.45);
        this.group.add(monoEyeRing);

        const monoEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), glowMaterial);
        monoEye.position.set(0, 2.3, -0.52);
        this.group.add(monoEye);

        const monoEyeRail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.36, 10), panelMaterial);
        monoEyeRail.rotation.z = Math.PI / 2;
        monoEyeRail.position.set(0, 2.3, -0.38);
        this.group.add(monoEyeRail);

        const shoulderLeft = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 14), panelMaterial);
        shoulderLeft.scale.set(1.2, 1.0, 1.1);
        shoulderLeft.position.set(-1.05, 1.85, 0);
        this.group.add(shoulderLeft);
        const shoulderRight = shoulderLeft.clone();
        shoulderRight.position.x = 1.05;
        this.group.add(shoulderRight);

        const upperArmLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.8, 14), bodyMaterial);
        upperArmLeft.position.set(-1.25, 1.25, 0);
        upperArmLeft.rotation.z = 0.15;
        this.group.add(upperArmLeft);
        const upperArmRight = upperArmLeft.clone();
        upperArmRight.position.x = 1.25;
        upperArmRight.rotation.z = -0.15;
        this.group.add(upperArmRight);

        const forearmLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.75, 14), coreMaterial);
        forearmLeft.position.set(-1.35, 0.55, 0.05);
        forearmLeft.rotation.z = 0.1;
        this.group.add(forearmLeft);
        const forearmRight = forearmLeft.clone();
        forearmRight.position.x = 1.35;
        forearmRight.rotation.z = -0.1;
        this.group.add(forearmRight);

        this.weaponMuzzle = new THREE.Object3D();
        this.weaponMuzzle.position.set(0, -0.45, -0.25);
        forearmRight.add(this.weaponMuzzle);

        const waist = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 10, 28), panelMaterial);
        waist.rotation.x = Math.PI / 2;
        waist.position.set(0, 0.95, 0);
        this.group.add(waist);

        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 0.65, 20), bodyMaterial);
        skirt.position.set(0, 0.55, 0);
        this.group.add(skirt);

        const thighLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.05, 16), bodyMaterial);
        thighLeft.position.set(-0.45, -0.15, 0);
        this.group.add(thighLeft);
        const thighRight = thighLeft.clone();
        thighRight.position.x = 0.45;
        this.group.add(thighRight);

        const shinLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.05, 16), coreMaterial);
        shinLeft.position.set(-0.45, -1.2, 0.05);
        this.group.add(shinLeft);
        const shinRight = shinLeft.clone();
        shinRight.position.x = 0.45;
        this.group.add(shinRight);

        const footLeft = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.85), bodyMaterial);
        footLeft.position.set(-0.45, -1.78, 0.25);
        this.group.add(footLeft);
        const footRight = footLeft.clone();
        footRight.position.x = 0.45;
        this.group.add(footRight);

        const backpack = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 14), coreMaterial);
        backpack.scale.set(1.1, 1.0, 0.9);
        backpack.position.set(0, 1.45, 0.55);
        this.group.add(backpack);

        const engineLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.6, 12), glowMaterial);
        engineLeft.rotation.x = Math.PI / 2;
        engineLeft.position.set(-0.32, 1.25, 1.0);
        this.group.add(engineLeft);
        const engineRight = engineLeft.clone();
        engineRight.position.x = 0.32;
        this.group.add(engineRight);

        const thrusterFlareMaterial = new THREE.MeshStandardMaterial({
            color: 0xff9a9a,
            emissive: 0xff3a3a,
            emissiveIntensity: 2.0,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const thrusterFlareLeft = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 12), thrusterFlareMaterial);
        thrusterFlareLeft.rotation.x = Math.PI / 2;
        thrusterFlareLeft.position.set(-0.55, -0.1, 1.5);
        this.group.add(thrusterFlareLeft);
        const thrusterFlareRight = thrusterFlareLeft.clone();
        thrusterFlareRight.position.x = 0.55;
        this.group.add(thrusterFlareRight);

        this.thrusterFlares = [thrusterFlareLeft, thrusterFlareRight];
        this.thrusterFlareMaterial = thrusterFlareMaterial;

        const markerColor = this.isEnemy ? 0xff6b6b : 0x6bb8ff;
        const markerEmissive = this.isEnemy ? 0xff3b3b : 0x2a6bff;
        const markerMaterial = new THREE.MeshStandardMaterial({
            color: markerColor,
            emissive: markerEmissive,
            emissiveIntensity: 1.6,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
        });
        this.markerRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.0, 28), markerMaterial);
        this.markerRing.rotation.x = Math.PI / 2;
        this.markerRing.position.set(0, 2.2, 0);
        this.group.add(this.markerRing);

        this.maxHp = stats?.maxHp ?? 80;
        this.hp = this.maxHp;
        this.maxShield = stats?.maxShield ?? 0;
        this.shield = this.maxShield;
    }

    onDamage(amount, { source = null } = {}) {
        if (this.hp <= 0) return;
        this._lastDamageSource = source;
        const before = this.hp + this.shield;
        let remaining = amount;
        if (this.shield > 0) {
            const absorbed = Math.min(this.shield, remaining);
            this.shield -= absorbed;
            remaining -= absorbed;
        }
        if (remaining > 0) {
            this.hp = Math.max(0, this.hp - remaining);
        }
        const after = this.hp + this.shield;
        if (this.events && after < before) {
            if (this.isEnemy) {
                this.events.emit("enemyHit", { enemy: this });
            } else if (this.isAlly) {
                this.events.emit("allyHit", { ally: this });
            }
        }
        if (this.hp === 0) {
            this.weapons.forEach((weapon) => {
                if (typeof weapon.clearVisuals === "function") {
                    weapon.clearVisuals();
                }
                if (typeof weapon.destroy === "function") {
                    weapon.destroy();
                }
            });
            this.group.visible = false;
            if (this.events) {
                if (this.isEnemy) {
                    this.events.emit("enemyKilled", { enemy: this });
                } else if (this.isAlly) {
                    this.events.emit("allyKilled", { ally: this });
                }
            }
        }
    }

    applyStun(duration) {
        this.stunTimer = Math.max(this.stunTimer, duration);
    }

    update(dt) {
        if (this.hp <= 0) return;
        if (this.markerRing) {
            this.markerRing.rotation.z += dt * 1.8;
        }
        if (this.stunTimer > 0) {
            this.stunTimer = Math.max(0, this.stunTimer - dt);
            this.stunPhase += dt * 10;
            const wobble = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(Math.sin(this.stunPhase) * 0.07, 0, Math.cos(this.stunPhase) * 0.1)
            );
            this.group.quaternion.copy(this._baseQuat).multiply(wobble);
            return;
        }

        const control = this.ai?.update(dt) || { move: { forward: 0, right: 0, up: 0 }, fire: false, desiredDirection: null };

        if (control.desiredDirection) {
            const desired = control.desiredDirection.clone().normalize();
            const targetPos = this.group.position.clone().add(desired);
            const desiredQuat = new THREE.Quaternion().setFromRotationMatrix(
                new THREE.Matrix4().lookAt(this.group.position, targetPos, new THREE.Vector3(0, 1, 0))
            );
            this.group.quaternion.slerp(desiredQuat, Math.min(1, dt * 2.2));
        }

        this._baseQuat.copy(this.group.quaternion);

        this.movement.applyForces(this.group, { move: control.move, roll: 0, boost: false }, dt);
        this.movement.integrate(this.group, { move: control.move, roll: 0, boost: false }, dt);

        if (this.thrusterFlares?.length) {
            const speed = this.movement.velocity.length();
            const max = this.movement.maxSpeed || 1;
            const ratio = Math.min(1, speed / max);
            const intensity = 0.15 + ratio * 0.85;
            this.thrusterFlareMaterial.opacity = intensity;
            this.thrusterFlares.forEach((flare) => {
                flare.scale.set(1, 0.5 + ratio * 0.8, 1);
            });
        }

        this.weapons.forEach((weapon) => {
            if (control.fire) {
                weapon.triggerStart();
            } else {
                weapon.triggerEnd();
            }
            weapon.update(dt);
        });
    }
}
