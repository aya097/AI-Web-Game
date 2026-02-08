import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { SpatialHashGrid } from "./SpatialHashGrid.js";

export class World {
    constructor({ cellSize = 50 } = {}) {
        this.entities = new Set();
        this.spatialIndex = new SpatialHashGrid(cellSize);
        this._entityId = 1;
    }

    add(entity) {
        if (!entity) return;
        if (!entity.__worldId) {
            entity.__worldId = this._entityId;
            this._entityId += 1;
        }
        this.entities.add(entity);
        if (entity.group) {
            this.spatialIndex.insert(entity, entity.group.getWorldPosition(new THREE.Vector3()));
        }
    }

    remove(entity) {
        if (!entity) return;
        this.entities.delete(entity);
        this.spatialIndex.remove(entity);
    }

    query() {
        return Array.from(this.entities);
    }

    queryNearby(position, radius) {
        if (!this.spatialIndex) return this.query();
        return this.spatialIndex.queryRadius(position, radius);
    }

    update(dt) {
        this.entities.forEach((entity) => {
            if (typeof entity.update === "function") {
                entity.update(dt);
            }
            if (entity.group) {
                this.spatialIndex.update(entity, entity.group.getWorldPosition(new THREE.Vector3()));
            }
        });
    }
}
