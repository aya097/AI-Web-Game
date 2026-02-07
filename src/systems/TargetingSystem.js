export class TargetingSystem {
    constructor({ camera }) {
        this.camera = camera;
        this.currentTarget = null;
    }

    acquireTarget(candidates = []) {
        this.currentTarget = candidates[0] || null;
        return this.currentTarget;
    }

    getCurrentTarget() {
        return this.currentTarget;
    }

    clear() {
        this.currentTarget = null;
    }
}
