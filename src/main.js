import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { InputSystem } from "./systems/InputSystem.js";
import { SixDoFMovement } from "./movement/SixDoFMovement.js";
import { Player } from "./entities/Player.js";
import { Game } from "./core/Game.js";
import { World } from "./core/World.js";
import { HUD } from "./ui/HUD.js";
import { CollisionSystem } from "./systems/CollisionSystem.js";
import { TargetingSystem } from "./systems/TargetingSystem.js";
import { FunnelWeapon } from "./weapons/FunnelWeapon.js";

const SETTINGS = {
    background: 0x05060a,
    camera: {
        fov: 60,
        near: 0.1,
        far: 2000,
        offset: new THREE.Vector3(0, 3, -12),
    },
    grid: {
        size: 400,
        divisions: 80,
        color1: 0x2a3b5f,
        color2: 0x111827,
    },
    stars: {
        count: 1500,
        radius: 900,
        size: 1.2,
    },
    light: {
        directional: { color: 0xffffff, intensity: 1.1, position: [10, 20, 10] },
        ambient: { color: 0x4a4a4a },
    },
};

const overlay = document.getElementById("overlay");
const hud = document.getElementById("hud");
const lockOnElement = document.getElementById("lockon");

const scene = new THREE.Scene();
scene.background = new THREE.Color(SETTINGS.background);

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

const input = new InputSystem(renderer.domElement);
renderer.domElement.addEventListener("click", () => {
    renderer.domElement.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
    overlay.style.display = document.pointerLockElement ? "none" : "grid";
});

const light = new THREE.DirectionalLight(
    SETTINGS.light.directional.color,
    SETTINGS.light.directional.intensity
);
light.position.set(...SETTINGS.light.directional.position);
scene.add(light);
scene.add(new THREE.AmbientLight(SETTINGS.light.ambient.color));

const grid = new THREE.GridHelper(
    SETTINGS.grid.size,
    SETTINGS.grid.divisions,
    SETTINGS.grid.color1,
    SETTINGS.grid.color2
);
grid.rotation.x = Math.PI / 2;
scene.add(grid);

const axisHelper = new THREE.AxesHelper(6);
scene.add(axisHelper);

function createStars() {
    const { count, radius, size } = SETTINGS.stars;
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
    maxSpeed: 80,
    boostMultiplier: 2.0,
    acceleration: 40,
});
const player = new Player(playerMovement);
scene.add(player.group);

const cameraOffset = SETTINGS.camera.offset.clone();
const cameraTarget = new THREE.Vector3();
const cameraOffsetWorld = new THREE.Vector3();

const world = new World();
world.add(player);

const decoys = [
    createDecoy(new THREE.Vector3(0, 0, 120)),
    createDecoy(new THREE.Vector3(30, 10, 180)),
    createDecoy(new THREE.Vector3(-40, -5, 160)),
];
decoys.forEach((decoy) => {
    scene.add(decoy.group);
    world.add(decoy);
});

const targetingSystem = new TargetingSystem({ camera, maxDistance: 300, fovDegrees: 30 });
const hudView = new HUD(hud, { player, movement: playerMovement, targeting: targetingSystem });

const funnelWeapon = new FunnelWeapon({
    owner: player,
    world,
    scene,
    targeting: targetingSystem,
    count: 3,
});
player.addWeapon(funnelWeapon);

const playerInputSystem = {
    beforeUpdate: ({ input: inputState }) => {
        player.applyInput(inputState);
    },
};

let lastLockInput = false;
const lockOnSystem = {
    update: ({ input: inputState, world: currentWorld }) => {
        const lockPressed = inputState.lockOn;
        const justPressed = lockPressed && !lastLockInput;
        lastLockInput = lockPressed;
        if (!justPressed) return;

        if (targetingSystem.getCurrentTarget()) {
            targetingSystem.clear();
            return;
        }

        const candidates = currentWorld.query().filter((entity) => entity?.isDecoy);
        targetingSystem.acquireTarget(candidates);
    },
};

const beamRange = 500;
const beamGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1, 8, 1, true);
const beamMaterial = new THREE.MeshStandardMaterial({
    color: 0x9fd7ff,
    emissive: 0x5ad1ff,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.8,
});
const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
beamMesh.visible = false;
scene.add(beamMesh);

const muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshStandardMaterial({
        color: 0xc9f2ff,
        emissive: 0x7ad7ff,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.9,
    })
);
muzzleFlash.visible = false;
scene.add(muzzleFlash);

let muzzleFlashTimer = 0;
const muzzleOffset = new THREE.Vector3(0.6, 1.4, 0.9);
let beamTimer = 0;
let fireCooldown = 0;
const fireCooldownDuration = 0.25;
let lastFireInput = false;

const weaponSystem = {
    update: ({ input: inputState, dt }) => {
        const firePressed = inputState.fire;
        const justPressed = firePressed && !lastFireInput;
        lastFireInput = firePressed;

        if (fireCooldown > 0) {
            fireCooldown = Math.max(0, fireCooldown - dt);
        }

        if (beamTimer > 0) {
            beamTimer = Math.max(0, beamTimer - dt);
            if (beamTimer === 0) {
                beamMesh.visible = false;
            }
        }

        if (muzzleFlashTimer > 0) {
            muzzleFlashTimer = Math.max(0, muzzleFlashTimer - dt);
            if (muzzleFlashTimer === 0) {
                muzzleFlash.visible = false;
            }
        }

        if (!justPressed || fireCooldown > 0) return;

        const origin = player.group
            .getWorldPosition(new THREE.Vector3())
            .add(muzzleOffset.clone().applyQuaternion(player.group.quaternion));
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.group.quaternion).normalize();
        const ray = new THREE.Ray(origin, forward);

        let hitEntity = null;
        let hitDistance = beamRange;

        world.query().forEach((entity) => {
            if (!entity?.isDecoy || !entity.group || typeof entity.colliderRadius !== "number") return;
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

        beamMesh.visible = true;
        beamMesh.scale.set(1, hitDistance, 1);
        beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);
        beamMesh.position.copy(origin).add(forward.clone().multiplyScalar(hitDistance * 0.5));
        beamTimer = 0.07;

        muzzleFlash.visible = true;
        muzzleFlash.position.copy(origin);
        muzzleFlashTimer = 0.06;
        fireCooldown = fireCooldownDuration;

        if (hitEntity) {
            if (typeof hitEntity.onDamage === "function") {
                hitEntity.onDamage(10);
            } else if (typeof hitEntity.onHit === "function") {
                hitEntity.onHit();
            }
        }
    },
};

const collisionSystem = new CollisionSystem();

const cameraFollowSystem = {
    afterUpdate: () => {
        cameraOffsetWorld.copy(cameraOffset).applyQuaternion(player.group.quaternion);
        const desired = player.group.position.clone().add(cameraOffsetWorld);
        camera.position.copy(desired);
        cameraTarget.copy(player.group.position);
        camera.lookAt(cameraTarget);
    },
};

const lockOnUiSystem = {
    afterUpdate: () => {
        const target = targetingSystem.getCurrentTarget();
        if (!lockOnElement || !target?.group) {
            if (lockOnElement) lockOnElement.style.display = "none";
            return;
        }

        const targetPos = target.group.getWorldPosition(new THREE.Vector3());
        const projected = targetPos.project(camera);
        const isInFront = projected.z > -1 && projected.z < 1;
        if (!isInFront) {
            lockOnElement.style.display = "none";
            return;
        }

        const x = (projected.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
        const y = (-projected.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
        lockOnElement.style.left = `${x}px`;
        lockOnElement.style.top = `${y}px`;
        lockOnElement.style.display = "block";
    },
};

const game = new Game({
    renderer,
    scene,
    camera,
    input,
    world,
    hud: hudView,
    systems: [playerInputSystem, lockOnSystem, weaponSystem, collisionSystem, cameraFollowSystem, lockOnUiSystem],
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
});
