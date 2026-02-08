import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { LaserWeapon } from "../weapons/LaserWeapon.js";

export class Battleship {
    constructor({ team = "enemy", world = null, scene = null, events = null, stats = {}, beam = {} } = {}) {
        this.team = team;
        this.world = world;
        this.scene = scene;
        this.events = events;
        this.weapons = [];
        this.group = new THREE.Group();
        this.isTargetable = true;
        this.isBattleship = true;
        this.isEnemy = team === "enemy";
        this.isAlly = team === "ally";
        this.colliderRadius = stats.colliderRadius ?? 14;
        this.maxHp = stats.maxHp ?? 900;
        this.hp = this.maxHp;
        this.maxShield = stats.maxShield ?? 0;
        this.shield = this.maxShield;
        this._target = null;
        this._targetResolver = null;
        this._enrageTimer = 0;
        this._enrageDuration = beam.enrageDuration ?? 0;
        this._enrageFireRateMult = beam.enrageFireRateMult ?? 1;
        this._enrageDamageMult = beam.enrageDamageMult ?? 1;

        const bodyColor = this.isEnemy ? 0x5a0f0f : 0x103a72;
        const panelColor = this.isEnemy ? 0xc94b4b : 0x5ab0ff;
        const glowColor = this.isEnemy ? 0xff6b6b : 0x7ad7ff;

        const hullMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.5, roughness: 0.35 });
        const panelMaterial = new THREE.MeshStandardMaterial({ color: panelColor, metalness: 0.55, roughness: 0.3 });
        const glowMaterial = new THREE.MeshStandardMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 1.2 });

        const core = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 50), hullMaterial);
        core.position.set(0, 0, 0);
        this.group.add(core);

        const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 26), panelMaterial);
        deck.position.set(0, 4, -6);
        this.group.add(deck);

        const bridge = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 8), panelMaterial);
        bridge.position.set(0, 7, -18);
        this.group.add(bridge);

        const engineLeft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 8, 12), glowMaterial);
        engineLeft.rotation.x = Math.PI / 2;
        engineLeft.position.set(-5, -1, 24);
        this.group.add(engineLeft);
        const engineRight = engineLeft.clone();
        engineRight.position.x = 5;
        this.group.add(engineRight);

        this.turret = new THREE.Group();
        this.turret.position.set(0, 4.5, 4);
        this.group.add(this.turret);

        const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 2.6, 16), panelMaterial);
        turretBase.position.set(0, 0, 0);
        this.turret.add(turretBase);

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 10, 12), glowMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.6, -5.5);
        this.turret.add(barrel);

        this.weaponMuzzle = new THREE.Object3D();
        this.weaponMuzzle.position.set(0, 0.6, -10.2);
        this.turret.add(this.weaponMuzzle);

        this.launchPoint = new THREE.Object3D();
        this.launchPoint.position.set(0, -1.2, 26);
        this.group.add(this.launchPoint);

        if (scene) scene.add(this.group);

        const beamWeapon = new LaserWeapon({
            owner: this,
            world,
            scene,
            damage: beam.damage ?? 14,
            range: beam.range ?? 420,
            fireRate: beam.fireRate ?? 1.5,
            beamColor: beam.beamColor ?? glowColor,
            beamEmissive: beam.beamEmissive ?? glowColor,
            beamRadius: beam.beamRadius ?? 0.18,
            beamDuration: beam.beamDuration ?? 0.18,
            getMuzzleWorldPosition: () => this.weaponMuzzle.getWorldPosition(new THREE.Vector3()),
            getAimDirection: () => {
                const target = this._target?.group ? this._target : null;
                if (!target?.group) {
                    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
                }
                const muzzle = this.weaponMuzzle.getWorldPosition(new THREE.Vector3());
                const targetPos = target.group.getWorldPosition(new THREE.Vector3());
                const direction = targetPos.sub(muzzle).normalize();
                const inaccuracyDeg = beam.inaccuracyDeg ?? 12;
                if (inaccuracyDeg <= 0) return direction;
                const inaccuracyRad = THREE.MathUtils.degToRad(inaccuracyDeg);
                const angle = Math.random() * inaccuracyRad;
                const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
                    .normalize();
                return direction.clone().applyAxisAngle(axis, angle).normalize();
            },
            onFire: beam.onFire ?? null,
        });
        this._beamBaseDamage = beamWeapon.damage;
        this._beamBaseFireRate = beamWeapon.fireRate;
        this.weapons.push(beamWeapon);
    }

    setTarget(target) {
        this._target = target;
    }

    setTargetResolver(resolver) {
        this._targetResolver = resolver;
    }

    getLaunchWorldPosition() {
        return this.launchPoint?.getWorldPosition(new THREE.Vector3()) ?? this.group.getWorldPosition(new THREE.Vector3());
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
            this.events.emit("battleshipHit", { ship: this });
        }
        if (this.team === "enemy" && this._enrageDuration > 0 && after < before) {
            this._enrageTimer = this._enrageDuration;
        }
        if (this.hp === 0) {
            this.group.visible = false;
            if (this.events) {
                this.events.emit("battleshipDestroyed", { ship: this });
            }
        }
    }

    update(dt) {
        if (this.hp <= 0) return;
        if (typeof this._targetResolver === "function") {
            this._target = this._targetResolver();
        }
        const target = this._target?.group ? this._target : null;
        if (target?.group) {
            const turretWorld = this.turret.getWorldPosition(new THREE.Vector3());
            const targetPos = target.group.getWorldPosition(new THREE.Vector3());
            const lookAt = turretWorld.clone().lerp(targetPos, 1);
            this.turret.lookAt(lookAt);
        }

        if (this._enrageTimer > 0) {
            this._enrageTimer = Math.max(0, this._enrageTimer - dt);
        }
        const enrageActive = this._enrageTimer > 0;

        this.weapons.forEach((weapon) => {
            if (weapon === this.weapons[0]) {
                const fireRate = enrageActive
                    ? this._beamBaseFireRate * this._enrageFireRateMult
                    : this._beamBaseFireRate;
                const damage = enrageActive
                    ? this._beamBaseDamage * this._enrageDamageMult
                    : this._beamBaseDamage;
                weapon.fireRate = fireRate;
                weapon.damage = damage;
            }
            const canFire = target?.group && target.hp !== 0;
            if (canFire) {
                weapon.triggerStart();
            } else {
                weapon.triggerEnd();
            }
            weapon.update(dt);
        });
    }
}
