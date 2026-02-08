import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export const GAME_CONFIG = {
    visuals: {
        background: 0x05060a,
        grid: { size: 400, divisions: 80, color1: 0x2a3b5f, color2: 0x111827 },
        stars: { count: 1500, radius: 900, size: 1.2 },
        light: {
            directional: { color: 0xffffff, intensity: 1.1, position: [10, 20, 10] },
            ambient: { color: 0x4a4a4a },
        },
    },
    camera: {
        fov: 60,
        near: 0.1,
        far: 2000,
        offset: new THREE.Vector3(0, 3, -12),
        smoothing: 0.12,
        smoothingDeadzone: 0.2,
        smoothingMaxStep: 8,
        smoothingMaxLag: 6,
        shake: { duration: 0.28, strength: 0.35 },
    },
    minimap: { size: 180, range: 180, radius: 72 },
    gameplay: {
        lives: 3,
        respawnDelay: 3.0,
        timeLimit: 300,
        killTarget: 20,
        comboWindow: 10,
        comboBonus: 50,
    },
    player: {
        maxSpeed: 80,
        acceleration: 40,
        boostMultiplier: 2.0,
        boostFuel: 5.0,
        boostRegenDelay: 1.0,
        boostRegenRate: 0.5,
        muzzleOffset: new THREE.Vector3(0.6, 1.4, 0.9),
    },
    targeting: {
        maxDistance: 300,
        fovDegrees: 30,
        lockOffDistance: 350,
    },
    weapons: {
        playerLaser: {
            damage: 10,
            range: 500,
            fireRate: 8,
            beamColor: 0x9fd7ff,
            beamEmissive: 0x5ad1ff,
            beamRadius: 0.07,
            beamDuration: 0.14,
        },
        enemyLaser: {
            damage: 8,
            range: 400,
            fireRate: 2,
            beamColor: 0xff9f9f,
            beamEmissive: 0xff4f4f,
            beamRadius: 0.07,
            beamDuration: 0.14,
        },
    },
    enemies: {
        spawn: {
            maxActive: 10,
            baseInterval: 10,
            minInterval: 5,
            radiusRange: [120, 260],
            heightRange: [-20, 20],
        },
        types: {
            grunt: {
                name: "Grunt",
                maxHp: 60,
                maxShield: 30,
                score: 100,
                fireRate: 4,
                ai: {
                    chaseDistance: 400,
                    attackDistance: 250,
                    attackAngleDeg: 20,
                    standoffDistance: 220,
                    standoffBand: 40,
                },
            },
            ace: {
                name: "Ace",
                maxHp: 120,
                maxShield: 60,
                score: 250,
                fireRate: 6,
                ai: {
                    chaseDistance: 450,
                    attackDistance: 280,
                    attackAngleDeg: 22,
                    standoffDistance: 240,
                    standoffBand: 50,
                },
            },
        },
    },
    obstacles: {
        count: 30,
        radiusRange: [8, 30],
        distanceRange: [200, 800],
    },
    spatialIndex: {
        cellSize: 50,
    },
};
