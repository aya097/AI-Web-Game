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
            for (let j = i + 1; j < entities.length; j += 1) {
                const a = entities[i];
                const b = entities[j];
                const posA = a.group.getWorldPosition(new THREE.Vector3());
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
