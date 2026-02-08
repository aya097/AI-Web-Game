import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class Player {
    constructor(movement) {
        this.movement = movement;
        this.group = new THREE.Group();
        this.weapons = [];
        this.colliderRadius = 1.2;
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.maxShield = 60;
        this.shield = this.maxShield;
        this.shieldRegenDelay = 2.0;
        this.shieldRegenRate = 0;
        this._timeSinceDamage = 0;
        this.maxBoostFuel = 5.0;
        this.boostFuel = this.maxBoostFuel;
        this.boostRegenDelay = 1.0;
        this.boostRegenRate = 0.5;
        this._timeSinceBoost = 0;
        this.collisionDamage = 5;
        this._collisionCooldown = 0;
        this.stunTimer = 0;
        this.stunPhase = 0;

        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0xeaf3ff, metalness: 0.7, roughness: 0.25 });
        const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x15306b, metalness: 0.6, roughness: 0.35 });
        const panelMaterial = new THREE.MeshStandardMaterial({ color: 0xbfd8ff, metalness: 0.5, roughness: 0.45 });
        const glowMaterial = new THREE.MeshStandardMaterial({ color: 0x7ad7ff, emissive: 0x2a6bff, emissiveIntensity: 1.0 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 0.75), mainMaterial);
        torso.position.set(0, 1.5, 0);
        this.group.add(torso);

        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.75, 0.9), panelMaterial);
        chestPlate.position.set(0, 2.0, 0.12);
        this.group.add(chestPlate);

        const chest = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.55, 0.82), accentMaterial);
        chest.position.set(0, 2.0, 0.05);
        this.group.add(chest);

        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), glowMaterial);
        cockpit.position.set(0, 2.05, 0.45);
        this.group.add(cockpit);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.45), mainMaterial);
        head.position.set(0, 2.6, 0.05);
        this.group.add(head);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.05), glowMaterial);
        visor.position.set(0, 2.6, 0.28);
        this.group.add(visor);

        const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), accentMaterial);
        crest.position.set(0, 2.95, 0.08);
        this.group.add(crest);

        const waist = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.5), accentMaterial);
        waist.position.set(0, 1.0, 0);
        this.group.add(waist);

        const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.45, 0.75), mainMaterial);
        skirt.position.set(0, 0.7, 0);
        this.group.add(skirt);

        const hipArmor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.9), panelMaterial);
        hipArmor.position.set(0, 0.9, 0.1);
        this.group.add(hipArmor);

        const shoulderLeft = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.55), accentMaterial);
        shoulderLeft.position.set(-0.95, 2.15, 0);
        this.group.add(shoulderLeft);

        const shoulderRight = shoulderLeft.clone();
        shoulderRight.position.x = 0.95;
        this.group.add(shoulderRight);

        const shoulderPlateLeft = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.7), panelMaterial);
        shoulderPlateLeft.position.set(-1.05, 2.35, 0.05);
        shoulderPlateLeft.rotation.z = -0.2;
        this.group.add(shoulderPlateLeft);
        const shoulderPlateRight = shoulderPlateLeft.clone();
        shoulderPlateRight.position.x = 1.05;
        shoulderPlateRight.rotation.z = 0.2;
        this.group.add(shoulderPlateRight);

        const shoulderPivotLeft = new THREE.Group();
        shoulderPivotLeft.position.set(-1.05, 2.05, 0.1);
        this.group.add(shoulderPivotLeft);
        const shoulderPivotRight = new THREE.Group();
        shoulderPivotRight.position.set(1.05, 2.05, 0.1);
        this.group.add(shoulderPivotRight);

        const upperArmLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), mainMaterial);
        upperArmLeft.position.set(0, -0.4, 0);
        shoulderPivotLeft.add(upperArmLeft);

        const upperArmRight = upperArmLeft.clone();
        shoulderPivotRight.add(upperArmRight);

        const forearmPivotLeft = new THREE.Group();
        forearmPivotLeft.position.set(0, -0.85, 0.05);
        shoulderPivotLeft.add(forearmPivotLeft);
        const forearmPivotRight = new THREE.Group();
        forearmPivotRight.position.set(0, -0.85, 0.05);
        shoulderPivotRight.add(forearmPivotRight);

        const forearmLeft = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.8, 0.34), accentMaterial);
        forearmLeft.position.set(0, -0.4, 0);
        forearmPivotLeft.add(forearmLeft);

        const forearmRight = forearmLeft.clone();
        forearmPivotRight.add(forearmRight);

        const forearmGuardLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.45), panelMaterial);
        forearmGuardLeft.position.set(0, -0.55, 0.2);
        forearmPivotLeft.add(forearmGuardLeft);
        const forearmGuardRight = forearmGuardLeft.clone();
        forearmPivotRight.add(forearmGuardRight);

        this.shoulderPivotLeft = shoulderPivotLeft;
        this.shoulderPivotRight = shoulderPivotRight;
        this.forearmPivotLeft = forearmPivotLeft;
        this.forearmPivotRight = forearmPivotRight;
        this.recoilKick = 0;

        const hipLeft = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), accentMaterial);
        hipLeft.position.set(-0.45, 0.3, 0);
        this.group.add(hipLeft);

        const hipRight = hipLeft.clone();
        hipRight.position.x = 0.45;
        this.group.add(hipRight);

        const thighLeft = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.0, 0.45), mainMaterial);
        thighLeft.position.set(-0.45, -0.4, 0);
        this.group.add(thighLeft);

        const thighRight = thighLeft.clone();
        thighRight.position.x = 0.45;
        this.group.add(thighRight);

        const shinLeft = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, 0.42), accentMaterial);
        shinLeft.position.set(-0.45, -1.35, 0.05);
        this.group.add(shinLeft);

        const shinRight = shinLeft.clone();
        shinRight.position.x = 0.45;
        this.group.add(shinRight);

        const shinPlateLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.6), panelMaterial);
        shinPlateLeft.position.set(-0.45, -1.6, 0.28);
        this.group.add(shinPlateLeft);
        const shinPlateRight = shinPlateLeft.clone();
        shinPlateRight.position.x = 0.45;
        this.group.add(shinPlateRight);

        const footLeft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.9), mainMaterial);
        footLeft.position.set(-0.45, -1.95, 0.2);
        this.group.add(footLeft);

        const footRight = footLeft.clone();
        footRight.position.x = 0.45;
        this.group.add(footRight);

        const backpack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.6), accentMaterial);
        backpack.position.set(0, 1.6, -0.5);
        this.group.add(backpack);

        const spineGlow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.2), glowMaterial);
        spineGlow.position.set(0, 1.6, -0.2);
        this.group.add(spineGlow);

        const thrusterLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.55, 14), glowMaterial);
        thrusterLeft.rotation.x = Math.PI / 2;
        thrusterLeft.position.set(-0.25, 1.2, -0.85);
        this.group.add(thrusterLeft);

        const thrusterRight = thrusterLeft.clone();
        thrusterRight.position.x = 0.25;
        this.group.add(thrusterRight);

        const thrusterRingLeft = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 10, 24), glowMaterial);
        thrusterRingLeft.position.set(-0.25, 1.2, -1.05);
        thrusterRingLeft.rotation.x = Math.PI / 2;
        this.group.add(thrusterRingLeft);
        const thrusterRingRight = thrusterRingLeft.clone();
        thrusterRingRight.position.x = 0.25;
        this.group.add(thrusterRingRight);

        const thrusterFlareMaterial = new THREE.MeshStandardMaterial({
            color: 0x9fe3ff,
            emissive: 0x4fd0ff,
            emissiveIntensity: 2.2,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const thrusterFlareLeft = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.9, 12), thrusterFlareMaterial);
        thrusterFlareLeft.rotation.x = Math.PI / 2;
        thrusterFlareLeft.position.set(-0.25, 1.2, -1.35);
        this.group.add(thrusterFlareLeft);
        const thrusterFlareRight = thrusterFlareLeft.clone();
        thrusterFlareRight.position.x = 0.25;
        this.group.add(thrusterFlareRight);

        this.thrusterFlares = [thrusterFlareLeft, thrusterFlareRight];
        this.thrusterFlareMaterial = thrusterFlareMaterial;

        const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.05), glowMaterial);
        antenna.position.set(0.15, 2.9, 0.05);
        this.group.add(antenna);

        this.rotation = new THREE.Euler(0, 0, 0, "YXZ");
        this.rollSpeed = THREE.MathUtils.degToRad(160);
        this.mouseSensitivity = 0.002;
        this.input = {
            move: { forward: 0, right: 0, up: 0 },
            roll: 0,
            boost: false,
            mouseDelta: { x: 0, y: 0 },
            fire: false,
            lockOn: false,
            funnel: false,
        };
    }

    applyInput(input) {
        this.input = input;
    }

    addWeapon(weapon) {
        this.weapons.push(weapon);
        if (typeof weapon.setOwner === "function") {
            weapon.setOwner(this);
        }
    }

    applyStun(duration) {
        this.stunTimer = Math.max(this.stunTimer, duration);
    }

    applyRecoil(amount) {
        this.recoilKick = Math.min(this.recoilKick + amount, 0.45);
    }

    onDamage(amount) {
        this._timeSinceDamage = 0;
        let remaining = amount;
        if (this.shield > 0) {
            const absorbed = Math.min(this.shield, remaining);
            this.shield -= absorbed;
            remaining -= absorbed;
        }
        if (remaining > 0) {
            this.hp = Math.max(0, this.hp - remaining);
        }
        return this.hp <= 0;
    }

    onCollision() {
        if (this._collisionCooldown > 0) return;
        this.onDamage(this.collisionDamage);
        this._collisionCooldown = 0.5;
    }

    update(dt) {
        if (this._collisionCooldown > 0) {
            this._collisionCooldown = Math.max(0, this._collisionCooldown - dt);
        }
        this._timeSinceDamage += dt;
        if (this.shieldRegenRate > 0 && this._timeSinceDamage >= this.shieldRegenDelay && this.shield < this.maxShield) {
            this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate * dt);
        }

        const effectiveInput = this.stunTimer > 0
            ? {
                ...this.input,
                move: { forward: 0, right: 0, up: 0 },
                roll: 0,
                boost: false,
                fire: false,
                lockOn: false,
                funnel: false,
            }
            : this.input;

        const hasMoveInput =
            effectiveInput.move.forward !== 0 ||
            effectiveInput.move.right !== 0 ||
            effectiveInput.move.up !== 0;
        const canBoost = this.boostFuel > 0;
        const isBoosting = effectiveInput.boost && hasMoveInput && canBoost;

        if (isBoosting) {
            this.boostFuel = Math.max(0, this.boostFuel - dt);
            this._timeSinceBoost = 0;
        } else {
            this._timeSinceBoost += dt;
            if (this._timeSinceBoost >= this.boostRegenDelay && this.boostFuel < this.maxBoostFuel) {
                this.boostFuel = Math.min(this.maxBoostFuel, this.boostFuel + this.boostRegenRate * dt);
            }
        }

        const processedInput = {
            ...effectiveInput,
            boost: isBoosting,
        };

        const { x, y } = effectiveInput.mouseDelta;
        this.rotation.y -= x * this.mouseSensitivity;
        this.rotation.x -= y * this.mouseSensitivity;
        const pitchLimit = THREE.MathUtils.degToRad(60);
        this.rotation.x = THREE.MathUtils.clamp(this.rotation.x, -pitchLimit, pitchLimit);
        this.rotation.z += processedInput.roll * this.rollSpeed * dt;

        const baseQuat = new THREE.Quaternion().setFromEuler(this.rotation);
        if (this.stunTimer > 0) {
            this.stunTimer = Math.max(0, this.stunTimer - dt);
            this.stunPhase += dt * 10;
            const wobble = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(Math.sin(this.stunPhase) * 0.08, 0, Math.cos(this.stunPhase) * 0.12)
            );
            baseQuat.multiply(wobble);
        }
        this.group.quaternion.copy(baseQuat);

        this.movement.applyForces(this.group, processedInput, dt);
        this.movement.integrate(this.group, processedInput, dt);

        this.weapons.forEach((weapon) => {
            const isEnabled = weapon?.enabled !== false;
            if (weapon?.inputKey && isEnabled) {
                if (processedInput[weapon.inputKey]) {
                    if (typeof weapon.triggerStart === "function") weapon.triggerStart();
                } else if (typeof weapon.triggerEnd === "function") {
                    weapon.triggerEnd();
                }
            } else if (weapon?.inputKey && !isEnabled && typeof weapon.triggerEnd === "function") {
                weapon.triggerEnd();
            }
            if (typeof weapon.update === "function") {
                weapon.update(dt, processedInput);
            }
        });

        if (this.shoulderPivotLeft && this.shoulderPivotRight) {
            const aimPitch = THREE.MathUtils.clamp(-this.rotation.x * 0.35, THREE.MathUtils.degToRad(-20), THREE.MathUtils.degToRad(20));
            const aimYaw = THREE.MathUtils.clamp(this.rotation.y * 0.2, THREE.MathUtils.degToRad(-25), THREE.MathUtils.degToRad(25));

            const leftShoulderPitch = -1.1 + aimPitch;
            const leftShoulderYaw = aimYaw;
            const leftShoulderRoll = 0.12;
            this.shoulderPivotRight.rotation.set(leftShoulderPitch, leftShoulderYaw, leftShoulderRoll);

            this.shoulderPivotLeft.rotation.set(aimPitch, -aimYaw, 0);

            this.recoilKick = THREE.MathUtils.damp(this.recoilKick, 0, 12, dt);
            const recoilAngle = -this.recoilKick;
            if (this.forearmPivotRight) this.forearmPivotRight.rotation.x = -0.6 + recoilAngle;
            if (this.forearmPivotLeft) this.forearmPivotLeft.rotation.x = recoilAngle;
        }

        if (this.thrusterFlares?.length) {
            const speed = this.movement.velocity.length();
            const max = this.movement.maxSpeed * (processedInput.boost ? this.movement.boostMultiplier : 1);
            const ratio = Math.min(1, speed / Math.max(1, max));
            const intensity = 0.15 + ratio * 0.85;
            this.thrusterFlareMaterial.opacity = intensity;
            this.thrusterFlares.forEach((flare) => {
                flare.scale.set(1, 0.6 + ratio * 0.9, 1);
            });
        }
    }
}
