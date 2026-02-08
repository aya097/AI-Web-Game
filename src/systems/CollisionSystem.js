import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class CollisionSystem {
    constructor() {
        this.lastResults = [];
    }

    update({ world }) {
        const entities = world
            .query()
            .filter((entity) => entity?.group && typeof entity.colliderRadius === "number");
        const results = [];

        for (let i = 0; i < entities.length; i += 1) {
            const a = entities[i];
            const posA = a.group.getWorldPosition(new THREE.Vector3());
            const searchRadius = a.colliderRadius + 50;
            const nearby = typeof world.queryNearby === "function" ? world.queryNearby(posA, searchRadius) : entities;

            for (let j = 0; j < nearby.length; j += 1) {
                const b = nearby[j];
                if (!b?.group || typeof b.colliderRadius !== "number") continue;
                if (b === a) continue;
                if (b.__worldId <= a.__worldId) continue;

                const posB = b.group.getWorldPosition(new THREE.Vector3());
                const distSq = posA.distanceToSquared(posB);
                const radius = a.colliderRadius + b.colliderRadius;
                if (distSq <= radius * radius) {
                    results.push({ a, b, distance: Math.sqrt(distSq) });
                    if (typeof a.onCollision === "function") a.onCollision(b);
                    if (typeof b.onCollision === "function") b.onCollision(a);
                }
            }
        }

        this.lastResults = results;
        return this.lastResults;
    }
}
