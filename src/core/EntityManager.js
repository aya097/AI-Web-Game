export class EntityManager {
    constructor(world, factory = null) {
        this.world = world;
        this.factory = factory;
    }

    spawn(type, data = {}) {
        if (!this.factory) {
            throw new Error("EntityFactory is not set");
        }
        const entity = this.factory.create(type, data);
        this.world.add(entity);
        return entity;
    }

    destroy(entity) {
        this.world.remove(entity);
        if (typeof entity.destroy === "function") {
            entity.destroy();
        }
    }

    find(predicate) {
        return this.world.query().find(predicate) || null;
    }
}
