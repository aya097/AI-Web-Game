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
        this.shieldRegenRate = 10;
        this._timeSinceDamage = 0;
        this.collisionDamage = 5;
        this._collisionCooldown = 0;

        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0xdbe8ff, metalness: 0.6, roughness: 0.35 });
        const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x1b2a55, metalness: 0.5, roughness: 0.5 });
        const glowMaterial = new THREE.MeshStandardMaterial({ color: 0x5ad1ff, emissive: 0x2a6bff, emissiveIntensity: 0.6 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.7), mainMaterial);
        torso.position.set(0, 1.5, 0);
        this.group.add(torso);

        const chest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.8), accentMaterial);
        chest.position.set(0, 2.0, 0.05);
        this.group.add(chest);

        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), glowMaterial);
        cockpit.position.set(0, 2.05, 0.45);
        this.group.add(cockpit);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.45), mainMaterial);
        head.position.set(0, 2.6, 0.05);
        this.group.add(head);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.05), glowMaterial);
        visor.position.set(0, 2.6, 0.28);
        this.group.add(visor);

        const waist = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.5), accentMaterial);
        waist.position.set(0, 1.0, 0);
        this.group.add(waist);

        const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.7), mainMaterial);
        skirt.position.set(0, 0.7, 0);
        this.group.add(skirt);

        const shoulderLeft = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), accentMaterial);
        shoulderLeft.position.set(-0.95, 2.15, 0);
        this.group.add(shoulderLeft);

        const shoulderRight = shoulderLeft.clone();
        shoulderRight.position.x = 0.95;
        this.group.add(shoulderRight);

        const upperArmLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), mainMaterial);
        upperArmLeft.position.set(-1.2, 1.55, 0);
        this.group.add(upperArmLeft);

        const upperArmRight = upperArmLeft.clone();
        upperArmRight.position.x = 1.2;
        this.group.add(upperArmRight);

        const forearmLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.75, 0.32), accentMaterial);
        forearmLeft.position.set(-1.2, 0.85, 0.05);
        this.group.add(forearmLeft);

        const forearmRight = forearmLeft.clone();
        forearmRight.position.x = 1.2;
        this.group.add(forearmRight);

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

        const shinLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.4), accentMaterial);
        shinLeft.position.set(-0.45, -1.35, 0.05);
        this.group.add(shinLeft);

        const shinRight = shinLeft.clone();
        shinRight.position.x = 0.45;
        this.group.add(shinRight);

        const footLeft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.9), mainMaterial);
        footLeft.position.set(-0.45, -1.95, 0.2);
        this.group.add(footLeft);

        const footRight = footLeft.clone();
        footRight.position.x = 0.45;
        this.group.add(footRight);

        const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), accentMaterial);
        backpack.position.set(0, 1.6, -0.5);
        this.group.add(backpack);

        const thrusterLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.4, 12), glowMaterial);
        thrusterLeft.rotation.x = Math.PI / 2;
        thrusterLeft.position.set(-0.25, 1.2, -0.85);
        this.group.add(thrusterLeft);

        const thrusterRight = thrusterLeft.clone();
        thrusterRight.position.x = 0.25;
        this.group.add(thrusterRight);

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
        if (this._timeSinceDamage >= this.shieldRegenDelay && this.shield < this.maxShield) {
            this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate * dt);
        }

        const { x, y } = this.input.mouseDelta;
        this.rotation.y -= x * this.mouseSensitivity;
        this.rotation.x -= y * this.mouseSensitivity;
        const pitchLimit = THREE.MathUtils.degToRad(60);
        this.rotation.x = THREE.MathUtils.clamp(this.rotation.x, -pitchLimit, pitchLimit);
        this.rotation.z += this.input.roll * this.rollSpeed * dt;

        this.group.quaternion.setFromEuler(this.rotation);

        this.movement.applyForces(this.group, this.input, dt);
        this.movement.integrate(this.group, this.input, dt);

        this.weapons.forEach((weapon) => {
            if (weapon?.inputKey) {
                if (this.input[weapon.inputKey]) {
                    if (typeof weapon.triggerStart === "function") weapon.triggerStart();
                } else if (typeof weapon.triggerEnd === "function") {
                    weapon.triggerEnd();
                }
            }
            if (typeof weapon.update === "function") {
                weapon.update(dt, this.input);
            }
        });
    }
}
