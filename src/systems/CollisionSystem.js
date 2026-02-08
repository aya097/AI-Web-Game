import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class CollisionSystem {
    constructor() {
        this.lastResults = [];
        this.restitution = 0.6;
        this.positionSlop = 0.01;
    }

    afterUpdate({ world }) {
        const entities = world
            .query()
            .filter((entity) => entity?.group && typeof entity.colliderRadius === "number")
            .filter((entity) => entity.group.visible !== false)
            .filter((entity) => typeof entity.hp !== "number" || entity.hp > 0);
        let maxRadius = 0;
        entities.forEach((entity) => {
            maxRadius = Math.max(maxRadius, entity.colliderRadius ?? 0);
        });
        const results = [];

        for (let i = 0; i < entities.length; i += 1) {
            const a = entities[i];
            const posA = a.group.getWorldPosition(new THREE.Vector3());
            const searchRadius = a.colliderRadius + maxRadius;
            const nearby = typeof world.queryNearby === "function" ? world.queryNearby(posA, searchRadius) : entities;

            for (let j = 0; j < nearby.length; j += 1) {
                const b = nearby[j];
                if (!b?.group || typeof b.colliderRadius !== "number") continue;
                if (b.group.visible === false) continue;
                if (typeof b.hp === "number" && b.hp <= 0) continue;
                if (b === a) continue;
                if (b.__worldId <= a.__worldId) continue;

                const movableA = !!a?.movement?.velocity;
                const movableB = !!b?.movement?.velocity;
                if (!movableA && !movableB) continue;

                const posB = b.group.getWorldPosition(new THREE.Vector3());
                const distSq = posA.distanceToSquared(posB);
                const radius = a.colliderRadius + b.colliderRadius;
                if (distSq <= radius * radius) {
                    const distance = Math.sqrt(distSq);
                    results.push({ a, b, distance });
                    this._resolveCollision(world, a, b, posA, posB, radius, distance);
                    if (typeof a.onCollision === "function") a.onCollision(b);
                    if (typeof b.onCollision === "function") b.onCollision(a);
                }
            }
        }

        this.lastResults = results;
        return this.lastResults;
    }

    _resolveCollision(world, a, b, posA, posB, radius, distance) {
        const movableA = !!a?.movement?.velocity;
        const movableB = !!b?.movement?.velocity;
        const normal = posA.clone().sub(posB);
        if (normal.lengthSq() === 0) {
            normal.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        }
        normal.normalize();

        const penetration = Math.max(0, radius - distance + this.positionSlop);
        const totalMovable = (movableA ? 1 : 0) + (movableB ? 1 : 0);

        if (penetration > 0) {
            if (totalMovable === 0) {
                return;
            }
            const moveA = movableA ? penetration * (movableB ? 0.5 : 1) : 0;
            const moveB = movableB ? penetration * (movableA ? 0.5 : 1) : 0;
            if (moveA > 0 && a.group) {
                a.group.position.addScaledVector(normal, moveA);
                if (world?.spatialIndex) {
                    world.spatialIndex.update(a, a.group.getWorldPosition(new THREE.Vector3()));
                }
            }
            if (moveB > 0 && b.group) {
                b.group.position.addScaledVector(normal, -moveB);
                if (world?.spatialIndex) {
                    world.spatialIndex.update(b, b.group.getWorldPosition(new THREE.Vector3()));
                }
            }
        }

        const vA = movableA ? a.movement.velocity : null;
        const vB = movableB ? b.movement.velocity : null;
        if (vA || vB) {
            const relativeVelocity = (vA ? vA.clone() : new THREE.Vector3()).sub(vB ? vB : new THREE.Vector3());
            const velAlongNormal = relativeVelocity.dot(normal);
            if (velAlongNormal > 0) return;
            const impulse = (1 + this.restitution) * velAlongNormal;
            if (vA) vA.addScaledVector(normal, -impulse * (movableB ? 0.5 : 1));
            if (vB) vB.addScaledVector(normal, impulse * (movableA ? 0.5 : 1));
        }
    }
}
