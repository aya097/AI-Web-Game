import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { InputSystem } from "./systems/InputSystem.js";
import { SixDoFMovement } from "./movement/SixDoFMovement.js";
import { Player } from "./entities/Player.js";
import { Enemy } from "./entities/Enemy.js";
import { Game } from "./core/Game.js";
import { World } from "./core/World.js";
import { EntityManager } from "./core/EntityManager.js";
import { EventBus } from "./core/EventBus.js";
import { HUD } from "./ui/HUD.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { TargetingSystem } from "./systems/TargetingSystem.js";
import { FunnelWeapon } from "./weapons/FunnelWeapon.js";
import { LaserWeapon } from "./weapons/LaserWeapon.js";
import { EnemyAI } from "./ai/EnemyAI.js";
import { GAME_CONFIG } from "./config/gameConfig.js";
import { createVfxManager } from "./vfx/ExplosionVFX.js";
import { SfxManager } from "./audio/SfxManager.js";

const SETTINGS = GAME_CONFIG;

const overlay = document.getElementById("overlay");
const hud = document.getElementById("hud");
const lockOnElement = document.getElementById("lockon");
const reticleElement = document.getElementById("reticle");
const minimapCanvas = document.getElementById("minimap");
const minimapCtx = minimapCanvas?.getContext("2d") || null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(SETTINGS.visuals.background);

const camera = new THREE.PerspectiveCamera(
    SETTINGS.camera.fov,
    window.innerWidth / window.innerHeight,
    SETTINGS.camera.near,
    SETTINGS.camera.far
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const minimapConfig = SETTINGS.minimap;

const setupMinimap = () => {
    if (!minimapCanvas || !minimapCtx) return;
    const dpr = window.devicePixelRatio || 1;
    minimapCanvas.width = minimapConfig.size * dpr;
    minimapCanvas.height = minimapConfig.size * dpr;
    minimapCanvas.style.width = `${minimapConfig.size}px`;
    minimapCanvas.style.height = `${minimapConfig.size}px`;
    minimapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

setupMinimap();

const input = new InputSystem(renderer.domElement);
const sfx = new SfxManager();
renderer.domElement.addEventListener("click", () => {
    renderer.domElement.requestPointerLock();
    sfx.unlock();
});

document.addEventListener("pointerlockchange", () => {
    overlay.style.display = document.pointerLockElement ? "none" : "grid";
});

const light = new THREE.DirectionalLight(
    SETTINGS.visuals.light.directional.color,
    SETTINGS.visuals.light.directional.intensity
);
light.position.set(...SETTINGS.visuals.light.directional.position);
scene.add(light);
scene.add(new THREE.AmbientLight(SETTINGS.visuals.light.ambient.color));

const grid = new THREE.GridHelper(
    SETTINGS.visuals.grid.size,
    SETTINGS.visuals.grid.divisions,
    SETTINGS.visuals.grid.color1,
    SETTINGS.visuals.grid.color2
);
grid.rotation.x = Math.PI / 2;
scene.add(grid);

const axisHelper = new THREE.AxesHelper(6);
scene.add(axisHelper);

const { spawnHitEffect, spawnExplosionEffect, system: vfxSystem } = createVfxManager(scene);

function createStars() {
    const { count, radius, size } = SETTINGS.visuals.stars;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
        const r = radius * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        starPositions[i * 3] = x;
        starPositions[i * 3 + 1] = y;
        starPositions[i * 3 + 2] = z;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size, sizeAttenuation: true });
    return new THREE.Points(starGeometry, starMaterial);
}

scene.add(createStars());

const decoyMaterial = new THREE.MeshStandardMaterial({
    color: 0xff7a57,
    metalness: 0.3,
    roughness: 0.6,
    emissive: 0x220000,
});
const decoyHitMaterial = new THREE.MeshStandardMaterial({
    color: 0x6cffb8,
    metalness: 0.2,
    roughness: 0.4,
    emissive: 0x1a7a4c,
});

const obstaclePalette = [0x2f3b4a, 0x4d5d73, 0x3b4556, 0x5a6b82, 0x6a7b94, 0x38424f];

function createObstacleMesh(radius) {
    const geometry = new THREE.SphereGeometry(radius, 18, 18);
    const position = geometry.attributes.position;
    const noiseStrength = radius * 0.25;
    const temp = new THREE.Vector3();

    for (let i = 0; i < position.count; i += 1) {
        temp.fromBufferAttribute(position, i);
        const noise = (Math.random() - 0.5) * noiseStrength;
        temp.multiplyScalar(1 + noise / radius);
        position.setXYZ(i, temp.x, temp.y, temp.z);
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const colliderRadius = geometry.boundingSphere?.radius ?? radius;

    const material = new THREE.MeshStandardMaterial({
        color: obstaclePalette[Math.floor(Math.random() * obstaclePalette.length)],
        roughness: 0.95,
        metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(1 + Math.random() * 0.35, 0.85 + Math.random() * 0.35, 1 + Math.random() * 0.35);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    return { mesh, colliderRadius: colliderRadius * Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z) };
}

function createDecoy(position) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 24), decoyMaterial);
    group.add(mesh);

    const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 20, 20),
        new THREE.MeshStandardMaterial({
            color: 0xb8f7ff,
            emissive: 0x58d0ff,
            emissiveIntensity: 1.8,
            metalness: 0.1,
            roughness: 0.2,
        })
    );
    group.add(core);

    const band = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.12, 12, 36),
        new THREE.MeshStandardMaterial({
            color: 0x7ad7ff,
            emissive: 0x2a6bff,
            emissiveIntensity: 0.8,
            metalness: 0.6,
            roughness: 0.3,
        })
    );
    band.rotation.x = Math.PI / 2;
    group.add(band);

    const finMaterial = new THREE.MeshStandardMaterial({
        color: 0xd7f3ff,
        emissive: 0x5ad1ff,
        emissiveIntensity: 0.6,
        metalness: 0.4,
        roughness: 0.4,
    });
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 0.12), finMaterial);
    fin.position.set(0, 0, 2.0);
    group.add(fin);
    const fin2 = fin.clone();
    fin2.rotation.y = Math.PI / 2;
    group.add(fin2);
    group.position.copy(position);

    const hitFlash = new THREE.Mesh(
        new THREE.RingGeometry(2.2, 2.9, 32),
        new THREE.MeshStandardMaterial({
            color: 0x7fe3ff,
            emissive: 0x58d0ff,
            emissiveIntensity: 2.6,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    const hitFlashInner = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.8, 20),
        new THREE.MeshStandardMaterial({
            color: 0xb8f7ff,
            emissive: 0x7ad7ff,
            emissiveIntensity: 2.4,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    const hitBurst = new THREE.PointLight(0x7ad7ff, 0, 18, 2);
    const burstSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 16, 16),
        new THREE.MeshStandardMaterial({
            color: 0xa6f0ff,
            emissive: 0x7ad7ff,
            emissiveIntensity: 2.8,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    const shockwave = new THREE.Mesh(
        new THREE.RingGeometry(2.8, 3.6, 36),
        new THREE.MeshStandardMaterial({
            color: 0x9fe6ff,
            emissive: 0x7ad7ff,
            emissiveIntensity: 2.0,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    const sparkGeometry = new THREE.BufferGeometry();
    const sparkCount = 32;
    const sparkPositions = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i += 1) {
        const r = 0.6 + Math.random() * 0.8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        sparkPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        sparkPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        sparkPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMaterial = new THREE.PointsMaterial({
        color: 0x9fe6ff,
        size: 0.14,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const sparks = new THREE.Points(sparkGeometry, sparkMaterial);

    const destroySphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 20, 20),
        new THREE.MeshStandardMaterial({
            color: 0xffc08a,
            emissive: 0xff7a3a,
            emissiveIntensity: 3.4,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    const destroyRing = new THREE.Mesh(
        new THREE.RingGeometry(3.2, 4.6, 36),
        new THREE.MeshStandardMaterial({
            color: 0xffc08a,
            emissive: 0xff7a3a,
            emissiveIntensity: 3.0,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    const destroyRingInner = new THREE.Mesh(
        new THREE.RingGeometry(1.6, 2.4, 24),
        new THREE.MeshStandardMaterial({
            color: 0xfff1c1,
            emissive: 0xffb36b,
            emissiveIntensity: 2.6,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })
    );
    destroyRing.rotation.x = Math.PI / 2;
    destroyRingInner.rotation.x = Math.PI / 2;
    hitBurst.position.set(0, 0, 0);
    hitFlash.rotation.x = Math.PI / 2;
    hitFlashInner.rotation.x = Math.PI / 2;
    shockwave.rotation.x = Math.PI / 2;
    group.add(hitFlash);
    group.add(hitFlashInner);
    group.add(hitBurst);
    group.add(burstSphere);
    group.add(sparks);
    group.add(shockwave);
    group.add(destroySphere);
    group.add(destroyRing);
    group.add(destroyRingInner);

    return {
        name: "Decoy",
        group,
        colliderRadius: 2,
        isDecoy: true,
        isTargetable: true,
        maxHp: 30,
        hp: 30,
        _hitTimer: 0,
        _flashTimer: 0,
        _destroyTimer: 0,
        _debrisTimer: 0,
        _deathDelay: 0,
        _respawnTimer: 0,
        respawnDelay: 6.0,
        onHit() {
            this._hitTimer = 2.0;
            mesh.material = decoyHitMaterial;
            this._flashTimer = 0.5;
        },
        onDamage(amount) {
            if (this.hp <= 0) return;
            this.hp = Math.max(0, this.hp - amount);
            this.onHit();
            if (this.hp === 0) {
                this._destroyTimer = 0.9;
                this._debrisTimer = 0.6;
                this._deathDelay = 0.35;
            }
        },
        update(dt) {
            if (this._hitTimer > 0) {
                this._hitTimer = Math.max(0, this._hitTimer - dt);
                if (this._hitTimer === 0) {
                    mesh.material = decoyMaterial;
                }
            }

            if (this._flashTimer > 0) {
                this._flashTimer = Math.max(0, this._flashTimer - dt);
                const t = this._flashTimer / 0.5;
                hitFlash.material.opacity = 0.95 * t;
                hitFlash.scale.setScalar(1 + (1 - t) * 1.4);
                hitFlash.rotation.z += dt * 2.5;

                hitFlashInner.material.opacity = 1.0 * t;
                hitFlashInner.scale.setScalar(1 + (1 - t) * 0.8);
                hitFlashInner.rotation.z -= dt * 3.2;

                shockwave.material.opacity = 0.8 * t;
                shockwave.scale.setScalar(1 + (1 - t) * 2.4);
                shockwave.rotation.z += dt * 4.5;

                hitBurst.intensity = 3.2 * t;
                burstSphere.material.opacity = 0.9 * t;
                burstSphere.scale.setScalar(1 + (1 - t) * 3.0);

                sparkMaterial.opacity = 1.0 * t;
                sparks.scale.setScalar(1 + (1 - t) * 2.2);
            } else {
                hitFlash.material.opacity = 0;
                hitFlash.scale.setScalar(1);
                hitFlashInner.material.opacity = 0;
                hitFlashInner.scale.setScalar(1);
                shockwave.material.opacity = 0;
                shockwave.scale.setScalar(1);
                hitBurst.intensity = 0;
                burstSphere.material.opacity = 0;
                burstSphere.scale.setScalar(1);
                sparkMaterial.opacity = 0;
                sparks.scale.setScalar(1);
            }

            if (this._destroyTimer > 0) {
                this._destroyTimer = Math.max(0, this._destroyTimer - dt);
                const t = this._destroyTimer / 0.9;
                destroySphere.material.opacity = 1.0 * t;
                destroySphere.scale.setScalar(1 + (1 - t) * 4.2);
                destroyRing.material.opacity = 0.9 * t;
                destroyRing.scale.setScalar(1 + (1 - t) * 3.4);
                destroyRing.rotation.z += dt * 4.2;
                destroyRingInner.material.opacity = 0.9 * t;
                destroyRingInner.scale.setScalar(1 + (1 - t) * 2.0);
                destroyRingInner.rotation.z -= dt * 5.4;
            } else {
                destroySphere.material.opacity = 0;
                destroySphere.scale.setScalar(1);
                destroyRing.material.opacity = 0;
                destroyRing.scale.setScalar(1);
                destroyRingInner.material.opacity = 0;
                destroyRingInner.scale.setScalar(1);
            }

            if (this._deathDelay > 0) {
                this._deathDelay = Math.max(0, this._deathDelay - dt);
                if (this._deathDelay === 0) {
                    this.group.visible = false;
                    this._respawnTimer = this.respawnDelay;
                }
            }

            if (this._debrisTimer > 0) {
                this._debrisTimer = Math.max(0, this._debrisTimer - dt);
                const t = this._debrisTimer / 0.6;
                sparkMaterial.opacity = Math.max(sparkMaterial.opacity, 0.9 * t);
                sparks.scale.setScalar(Math.max(sparks.scale.x, 1 + (1 - t) * 3.2));
            }

            if (this._respawnTimer > 0) {
                this._respawnTimer = Math.max(0, this._respawnTimer - dt);
                if (this._respawnTimer === 0) {
                    this.hp = this.maxHp;
                    this.group.visible = true;
                    mesh.material = decoyMaterial;
                }
            }
        },
    };
}

const playerMovement = new SixDoFMovement({
    maxSpeed: SETTINGS.player.maxSpeed,
    boostMultiplier: SETTINGS.player.boostMultiplier,
    acceleration: SETTINGS.player.acceleration,
});
const player = new Player(playerMovement);
player.maxBoostFuel = SETTINGS.player.boostFuel ?? player.maxBoostFuel;
player.boostFuel = player.maxBoostFuel;
player.boostRegenDelay = SETTINGS.player.boostRegenDelay ?? player.boostRegenDelay;
player.boostRegenRate = SETTINGS.player.boostRegenRate ?? player.boostRegenRate;
player._deathHandled = false;
scene.add(player.group);

const cameraOffset = SETTINGS.camera.offset.clone();
const cameraTarget = new THREE.Vector3();
const cameraOffsetWorld = new THREE.Vector3();
const cameraShakeOffset = new THREE.Vector3();
const cameraFollowDelta = new THREE.Vector3();
const cameraTargetDelta = new THREE.Vector3();
let cameraShakeTime = 0;
const cameraShakeDuration = SETTINGS.camera.shake.duration;
const cameraShakeMax = SETTINGS.camera.shake.strength;
const cameraSmoothingRaw = SETTINGS.camera.smoothing ?? 0;
const cameraSmoothing = cameraSmoothingRaw > 0
    ? THREE.MathUtils.clamp(cameraSmoothingRaw, 0.03, 0.2)
    : 0;
const cameraSmoothingDeadzone = SETTINGS.camera.smoothingDeadzone ?? 0;
const cameraSmoothingMaxStep = SETTINGS.camera.smoothingMaxStep ?? Infinity;
const cameraSmoothingMaxLag = SETTINGS.camera.smoothingMaxLag ?? 6;

const world = new World({ cellSize: SETTINGS.spatialIndex.cellSize });
world.add(player);

const gameState = {
    score: 0,
    lives: SETTINGS.gameplay.lives,
    elapsedTime: 0,
    kills: 0,
    comboCount: 0,
    lastKillTime: -Infinity,
    respawnTimer: 0,
    isRespawning: false,
    result: null,
};

const events = new EventBus();

const baseOnDamage = player.onDamage.bind(player);
player.onDamage = (amount) => {
    if (gameState.isRespawning || gameState.result) return false;
    const isDead = baseOnDamage(amount);
    cameraShakeTime = cameraShakeDuration;
    spawnHitEffect(player.group.getWorldPosition(new THREE.Vector3()), 0x7ad7ff);
    sfx.playHit();
    if (isDead && !player._deathHandled) {
        player._deathHandled = true;
        const pos = player.group.getWorldPosition(new THREE.Vector3());
        spawnExplosionEffect(pos, 0x7ad7ff);
        sfx.playExplosion();
        player.weapons.forEach((weapon) => {
            if (typeof weapon.clearVisuals === "function") {
                weapon.clearVisuals();
            }
            if (typeof weapon.destroyDrones === "function") {
                weapon.drones?.forEach((drone) => {
                    if (drone?.group) {
                        spawnExplosionEffect(drone.group.getWorldPosition(new THREE.Vector3()), 0x7ad7ff);
                    }
                });
                weapon.destroyDrones();
            }
        });
    }
    return isDead;
};

const entityFactory = {
    create(type, data = {}) {
        if (type === "decoy") {
            const position = data.position || new THREE.Vector3();
            const decoy = createDecoy(position);
            if (decoy.group) scene.add(decoy.group);
            return decoy;
        }
        if (type === "enemy") {
            const enemyType = data.enemyType || "grunt";
            const stats = SETTINGS.enemies.types[enemyType] ?? SETTINGS.enemies.types.grunt;
            const enemyMovement = new SixDoFMovement({ maxSpeed: 60, boostMultiplier: 1.2, acceleration: 28, damping: 0.99 });
            const enemy = new Enemy(enemyMovement, null, { type: enemyType, stats, events });
            enemy.name = stats.name;
            if (data.position) enemy.group.position.copy(data.position);
            const enemyAI = new EnemyAI({ owner: enemy, target: player, profile: stats.ai });
            enemy.ai = enemyAI;
            const enemyLaser = new LaserWeapon({
                owner: enemy,
                world,
                scene,
                damage: SETTINGS.weapons.enemyLaser.damage,
                range: SETTINGS.weapons.enemyLaser.range,
                fireRate: stats.fireRate ?? SETTINGS.weapons.enemyLaser.fireRate,
                beamColor: SETTINGS.weapons.enemyLaser.beamColor,
                beamEmissive: SETTINGS.weapons.enemyLaser.beamEmissive,
                beamRadius: SETTINGS.weapons.enemyLaser.beamRadius,
                beamDuration: SETTINGS.weapons.enemyLaser.beamDuration,
                getMuzzleWorldPosition: () =>
                    enemy.weaponMuzzle
                        ? enemy.weaponMuzzle.getWorldPosition(new THREE.Vector3())
                        : enemy.group.getWorldPosition(new THREE.Vector3()),
                onFire: () => sfx.playLaser({ isEnemy: true }),
            });
            enemy.weapons.push(enemyLaser);
            if (enemy.group) scene.add(enemy.group);
            return enemy;
        }
        if (type === "asteroid") {
            const radius = data.radius ?? 12;
            const { mesh, colliderRadius } = createObstacleMesh(radius);
            const group = new THREE.Group();
            group.add(mesh);
            if (data.position) group.position.copy(data.position);
            const asteroid = {
                name: "Asteroid",
                group,
                colliderRadius,
                isObstacle: true,
                isTargetable: false,
                update() { },
            };
            scene.add(group);
            return asteroid;
        }
        throw new Error(`Unknown entity type: ${type}`);
    },
};

const entityManager = new EntityManager(world, entityFactory);

const decoys = [
    new THREE.Vector3(0, 0, 120),
    new THREE.Vector3(30, 10, 180),
    new THREE.Vector3(-40, -5, 160),
].map((position) => entityManager.spawn("decoy", { position }));

const randomInRange = (min, max) => min + Math.random() * (max - min);
const spawnObstacleField = () => {
    const [minRadius, maxRadius] = SETTINGS.obstacles.radiusRange;
    const [minDist, maxDist] = SETTINGS.obstacles.distanceRange;

    for (let i = 0; i < SETTINGS.obstacles.count; i += 1) {
        const radius = randomInRange(minRadius, maxRadius);
        const dist = randomInRange(minDist, maxDist);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const position = new THREE.Vector3(
            dist * Math.sin(phi) * Math.cos(theta),
            dist * Math.cos(phi),
            dist * Math.sin(phi) * Math.sin(theta)
        );
        entityManager.spawn("asteroid", { radius, position });
    }
};
if (SETTINGS.obstacles.count > 0) {
    spawnObstacleField();
}

const targetingSystem = new TargetingSystem({
    camera,
    maxDistance: SETTINGS.targeting.maxDistance,
    fovDegrees: SETTINGS.targeting.fovDegrees,
    lockOffDistance: SETTINGS.targeting.lockOffDistance,
});
const funnelWeapon = new FunnelWeapon({
    owner: player,
    world,
    scene,
    targeting: targetingSystem,
    count: 3,
});
player.addWeapon(funnelWeapon);

const hudView = new HUD(hud, { player, movement: playerMovement, targeting: targetingSystem, funnelWeapon, gameState });

const playerMuzzleOffset = new THREE.Vector3(0.0, 0.25, 0.35);
const playerReticleOffset = new THREE.Vector3(0.0, 0.55, 0.35);
const playerMuzzleWorld = new THREE.Vector3();
const playerMuzzleOffsetWorld = new THREE.Vector3();
const playerAimDirection = new THREE.Vector3();
const playerReticleWorld = new THREE.Vector3();
const playerReticleOffsetWorld = new THREE.Vector3();
const playerReticleRayPoint = new THREE.Vector3();

const getRightShoulderBase = () =>
(player.shoulderPivotRight
    ? player.shoulderPivotRight.getWorldPosition(playerMuzzleWorld)
    : player.group.getWorldPosition(playerMuzzleWorld));

const getPlayerMuzzleWorld = () => {
    const base = getRightShoulderBase();
    playerMuzzleOffsetWorld.copy(playerMuzzleOffset).applyQuaternion(player.group.quaternion);
    return base.add(playerMuzzleOffsetWorld);
};

const getPlayerReticleWorld = () => {
    const base = getRightShoulderBase();
    playerReticleOffsetWorld.copy(playerReticleOffset).applyQuaternion(player.group.quaternion);
    return playerReticleWorld.copy(base).add(playerReticleOffsetWorld);
};

const playerLaser = new LaserWeapon({
    owner: player,
    world,
    scene,
    damage: SETTINGS.weapons.playerLaser.damage,
    range: SETTINGS.weapons.playerLaser.range,
    fireRate: SETTINGS.weapons.playerLaser.fireRate,
    beamColor: SETTINGS.weapons.playerLaser.beamColor,
    beamEmissive: SETTINGS.weapons.playerLaser.beamEmissive,
    beamRadius: SETTINGS.weapons.playerLaser.beamRadius,
    beamDuration: SETTINGS.weapons.playerLaser.beamDuration,
    getMuzzleWorldPosition: () => {
        return getPlayerMuzzleWorld();
    },
    getAimDirection: () => {
        const reticleWorld = getPlayerReticleWorld();
        const cameraRayDir = reticleWorld.clone().sub(camera.position).normalize();
        const rayDistance = SETTINGS.weapons.playerLaser.range ?? 500;
        playerReticleRayPoint.copy(camera.position).addScaledVector(cameraRayDir, rayDistance);
        const muzzleWorld = getPlayerMuzzleWorld();
        return playerAimDirection.copy(playerReticleRayPoint).sub(muzzleWorld).normalize();
    },
    inputKey: "fire",
    recoilKick: 0.35,
    onFire: () => sfx.playLaser({ isEnemy: false }),
});
player.addWeapon(playerLaser);

const playerInputSystem = {
    beforeUpdate: ({ input: inputState }) => {
        if (player.hp <= 0 || gameState.isRespawning || gameState.result) {
            player.applyInput({
                move: { forward: 0, right: 0, up: 0 },
                roll: 0,
                boost: false,
                fire: false,
                lockOn: false,
                funnel: false,
                mouseDelta: { x: 0, y: 0 },
            });
            return;
        }
        player.applyInput(inputState);
    },
};

let lastLockInput = false;
const lockOnSystem = {
    update: ({ input: inputState, world: currentWorld }) => {
        targetingSystem.update();
        const lockPressed = inputState.lockOn;
        const justPressed = lockPressed && !lastLockInput;
        lastLockInput = lockPressed;
        if (!justPressed) return;

        if (targetingSystem.getCurrentTarget()) {
            targetingSystem.clear();
            return;
        }

        const candidates = currentWorld.query().filter((entity) => entity?.isTargetable);
        targetingSystem.acquireTarget(candidates);
    },
};

const spawnState = {
    timer: 0,
    nextInterval: SETTINGS.enemies.spawn.baseInterval,
};

const chooseEnemyType = () => {
    const t = gameState.elapsedTime;
    if (t > SETTINGS.gameplay.timeLimit * 0.6 && Math.random() < 0.4) return "ace";
    if (t > SETTINGS.gameplay.timeLimit * 0.3 && Math.random() < 0.2) return "ace";
    return "grunt";
};

const spawnEnemy = () => {
    const [minR, maxR] = SETTINGS.enemies.spawn.radiusRange;
    const [minY, maxY] = SETTINGS.enemies.spawn.heightRange;
    const radius = randomInRange(minR, maxR);
    const angle = Math.random() * Math.PI * 2;
    const position = player.group.position
        .clone()
        .add(new THREE.Vector3(Math.cos(angle) * radius, randomInRange(minY, maxY), Math.sin(angle) * radius));
    const enemyType = chooseEnemyType();
    entityManager.spawn("enemy", { position, enemyType });
};

events.on("enemyKilled", ({ enemy }) => {
    const now = gameState.elapsedTime;
    if (now - gameState.lastKillTime <= SETTINGS.gameplay.comboWindow) {
        gameState.comboCount += 1;
        gameState.score += SETTINGS.gameplay.comboBonus;
    } else {
        gameState.comboCount = 1;
    }
    gameState.lastKillTime = now;
    gameState.kills += 1;
    gameState.score += enemy?.scoreValue ?? 100;
    if (enemy?.group) {
        spawnExplosionEffect(enemy.group.getWorldPosition(new THREE.Vector3()), 0xff7a7a);
    }
    sfx.playExplosion();

    if (enemy?.group) {
        const epicenter = enemy.group.getWorldPosition(new THREE.Vector3());
        const nearby = world.queryNearby ? world.queryNearby(epicenter, 55) : world.query();
        nearby.forEach((entity) => {
            if (entity?.applyStun) {
                entity.applyStun(0.9);
            }
        });
    }
});

events.on("enemyHit", ({ enemy }) => {
    if (!enemy?.group) return;
    spawnHitEffect(enemy.group.getWorldPosition(new THREE.Vector3()), 0xff6b6b);
    sfx.playHit();
});

const collisionSystem = new CollisionSystem();

const cameraFollowSystem = {
    afterUpdate: ({ dt }) => {
        cameraOffsetWorld.copy(cameraOffset).applyQuaternion(player.group.quaternion);
        const desired = player.group.position.clone().add(cameraOffsetWorld);
        const targetDesired = player.group.position;
        const lerpFactor = cameraSmoothing > 0 ? 1 - Math.exp(-dt / cameraSmoothing) : 1;

        const applyFollow = (current, desiredPos, deltaVec) => {
            deltaVec.copy(desiredPos).sub(current);
            const distance = deltaVec.length();
            if (distance <= cameraSmoothingDeadzone) return;

            let moveLen = distance * lerpFactor;
            const requiredMove = distance > cameraSmoothingMaxLag ? distance - cameraSmoothingMaxLag : 0;
            moveLen = Math.max(moveLen, requiredMove);
            moveLen = Math.min(moveLen, cameraSmoothingMaxStep, distance);
            if (moveLen <= 0) return;

            deltaVec.multiplyScalar(moveLen / distance);
            current.add(deltaVec);
        };

        applyFollow(camera.position, desired, cameraFollowDelta);
        applyFollow(cameraTarget, targetDesired, cameraTargetDelta);

        if (cameraShakeTime > 0) {
            cameraShakeTime = Math.max(0, cameraShakeTime - dt);
            const shakeStrength = (cameraShakeTime / cameraShakeDuration) * cameraShakeMax;
            cameraShakeOffset.set(
                (Math.random() - 0.5) * 2 * shakeStrength,
                (Math.random() - 0.5) * 2 * shakeStrength,
                (Math.random() - 0.5) * 2 * shakeStrength
            );
        } else {
            cameraShakeOffset.set(0, 0, 0);
        }

        camera.position.add(cameraShakeOffset);
        cameraTarget.add(cameraShakeOffset);
        camera.lookAt(cameraTarget);
    },
};

const lockOnUiSystem = {
    afterUpdate: () => {
        const target = targetingSystem.getCurrentTarget();
        if (!lockOnElement || !target?.group) {
            if (lockOnElement) lockOnElement.style.display = "none";
        } else {
            const targetPos = target.group.getWorldPosition(new THREE.Vector3());
            const projected = targetPos.project(camera);
            const isInFront = projected.z > -1 && projected.z < 1;
            if (!isInFront) {
                lockOnElement.style.display = "none";
            } else {
                const x = (projected.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
                const y = (-projected.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
                lockOnElement.style.left = `${x}px`;
                lockOnElement.style.top = `${y}px`;
                lockOnElement.style.display = "block";
            }
        }

        if (!reticleElement) return;
        const reticleWorld = getPlayerReticleWorld();
        const projectedReticle = reticleWorld.project(camera);
        const reticleInFront = projectedReticle.z > -1 && projectedReticle.z < 1;
        if (!reticleInFront) {
            reticleElement.style.display = "none";
            return;
        }
        const rx = (projectedReticle.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
        const ry = (-projectedReticle.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
        reticleElement.style.left = `${rx}px`;
        reticleElement.style.top = `${ry}px`;
        reticleElement.style.display = "block";
    },
};

const minimapSystem = {
    afterUpdate: () => {
        if (!minimapCtx || !minimapCanvas) return;

        const size = minimapConfig.size;
        const center = size / 2;
        const ctx = minimapCtx;
        ctx.clearRect(0, 0, size, size);

        ctx.save();
        ctx.translate(center, center);

        ctx.beginPath();
        ctx.arc(0, 0, minimapConfig.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "rgba(6, 14, 26, 0.65)";
        ctx.fillRect(-center, -center, size, size);

        ctx.strokeStyle = "rgba(90, 180, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, minimapConfig.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.arc(0, 0, minimapConfig.radius * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(90, 180, 255, 0.15)";
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(-minimapConfig.radius, 0);
        ctx.lineTo(minimapConfig.radius, 0);
        ctx.moveTo(0, -minimapConfig.radius);
        ctx.lineTo(0, minimapConfig.radius);
        ctx.strokeStyle = "rgba(90, 180, 255, 0.15)";
        ctx.stroke();

        const playerPos = player.group.getWorldPosition(new THREE.Vector3());
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.group.quaternion).normalize();
        const yaw = Math.atan2(forward.x, forward.z);
        const cos = Math.cos(-yaw);
        const sin = Math.sin(-yaw);
        const scale = minimapConfig.radius / minimapConfig.range;

        const project = (pos) => {
            const dx = pos.x - playerPos.x;
            const dz = pos.z - playerPos.z;
            let rx = dx * cos - dz * sin;
            let rz = dx * sin + dz * cos;
            const dist = Math.hypot(rx, rz);
            if (dist > minimapConfig.range) {
                const ratio = minimapConfig.range / dist;
                rx *= ratio;
                rz *= ratio;
            }
            return { x: rx * scale, y: -rz * scale };
        };

        const lockTarget = targetingSystem.getCurrentTarget();

        world.query().forEach((entity) => {
            if (!entity?.group || entity === player) return;
            if (!entity.isEnemy && !entity.isDecoy) return;
            if (entity.hp !== undefined && entity.hp <= 0) return;
            const p = project(entity.group.getWorldPosition(new THREE.Vector3()));
            ctx.beginPath();
            ctx.fillStyle = entity.isEnemy ? "rgba(255, 120, 120, 0.9)" : "rgba(255, 210, 120, 0.9)";
            ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
            ctx.fill();

            if (lockTarget && entity === lockTarget) {
                ctx.strokeStyle = "rgba(180, 240, 255, 0.9)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        ctx.fillStyle = "rgba(120, 220, 255, 0.95)";
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(6, 8);
        ctx.lineTo(-6, 8);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(120, 220, 255, 0.65)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    },
};

const spawnSystem = {
    afterUpdate: ({ dt, world: currentWorld }) => {
        if (gameState.result) return;
        const activeEnemies = currentWorld
            .query()
            .filter((entity) => entity?.isEnemy && entity.hp > 0).length;

        if (activeEnemies >= SETTINGS.enemies.spawn.maxActive) return;

        spawnState.timer -= dt;
        if (spawnState.timer > 0) return;

        spawnEnemy();

        const progress = Math.min(1, gameState.elapsedTime / SETTINGS.gameplay.timeLimit);
        const interval = SETTINGS.enemies.spawn.baseInterval -
            progress * (SETTINGS.enemies.spawn.baseInterval - SETTINGS.enemies.spawn.minInterval);
        spawnState.nextInterval = Math.max(SETTINGS.enemies.spawn.minInterval, interval);
        spawnState.timer = spawnState.nextInterval;
    },
};

const gameStateSystem = {
    afterUpdate: ({ dt, world: currentWorld }) => {
        if (gameState.result) return;

        gameState.elapsedTime += dt;

        if (gameState.isRespawning) {
            gameState.respawnTimer = Math.max(0, gameState.respawnTimer - dt);
            if (gameState.respawnTimer === 0) {
                gameState.isRespawning = false;
                player.hp = player.maxHp;
                player.shield = player.maxShield;
                player._deathHandled = false;
                player.weapons.forEach((weapon) => {
                    if (typeof weapon.resetDrones === "function") {
                        weapon.resetDrones();
                    }
                });
                player.group.visible = true;
                player.group.position.set(0, 0, 0);
                player.rotation.set(0, 0, 0);
                player.group.quaternion.setFromEuler(player.rotation);
                playerMovement.velocity.set(0, 0, 0);
            }
            return;
        }

        if (player.hp <= 0) {
            gameState.lives = Math.max(0, gameState.lives - 1);
            if (gameState.lives <= 0) {
                gameState.result = "DEFEAT";
                return;
            }
            gameState.isRespawning = true;
            gameState.respawnTimer = SETTINGS.gameplay.respawnDelay;
            player.group.visible = false;
            return;
        }

        if (gameState.elapsedTime >= SETTINGS.gameplay.timeLimit || gameState.kills >= SETTINGS.gameplay.killTarget) {
            gameState.result = "VICTORY";
        }

        const enemies = currentWorld.query().filter((entity) => entity?.isEnemy);
        if (enemies.length > 0 && enemies.every((enemyEntity) => enemyEntity.hp <= 0)) {
            gameState.result = "VICTORY";
        }
    },
};

const game = new Game({
    renderer,
    scene,
    camera,
    input,
    world,
    hud: hudView,
    systems: [playerInputSystem, lockOnSystem, collisionSystem, cameraFollowSystem, lockOnUiSystem, minimapSystem, spawnSystem, vfxSystem, gameStateSystem],
});

function animate(time) {
    game.update(time);
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    setupMinimap();
});
