export class World {
    constructor() {
        this.entities = new Set();
        this.spatialIndex = null;
    }

    add(entity) {
        this.entities.add(entity);
    }

    remove(entity) {
        this.entities.delete(entity);
    }

    query() {
        return Array.from(this.entities);
    }

    update(dt) {
        this.entities.forEach((entity) => {
            if (typeof entity.update === "function") {
                entity.update(dt);
            }
        });
    }
}
