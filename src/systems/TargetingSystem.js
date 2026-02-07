import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class TargetingSystem {
    constructor({ camera, maxDistance = 300, fovDegrees = 30 } = {}) {
        this.camera = camera;
        this.maxDistance = maxDistance;
        this.fovRadians = THREE.MathUtils.degToRad(fovDegrees);
        this.currentTarget = null;
    }

    acquireTarget(candidates = []) {
        if (!this.camera) {
            this.currentTarget = null;
            return this.currentTarget;
        }

        const origin = this.camera.getWorldPosition(new THREE.Vector3());
        const forward = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
        const maxDistanceSq = this.maxDistance * this.maxDistance;

        let best = null;
        let bestScore = Infinity;

        candidates.forEach((candidate) => {
            if (!candidate?.group) return;
            const toTarget = candidate.group.getWorldPosition(new THREE.Vector3()).sub(origin);
            const distSq = toTarget.lengthSq();
            if (distSq === 0 || distSq > maxDistanceSq) return;

            const angle = Math.acos(THREE.MathUtils.clamp(forward.dot(toTarget.clone().normalize()), -1, 1));
            if (angle > this.fovRadians) return;

            const score = angle * 1000 + Math.sqrt(distSq);
            if (score < bestScore) {
                bestScore = score;
                best = candidate;
            }
        });

        this.currentTarget = best;
        return this.currentTarget;
    }

    getCurrentTarget() {
        return this.currentTarget;
    }

    clear() {
        this.currentTarget = null;
    }
}
