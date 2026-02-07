import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class SixDoFMovement {
    constructor({ maxSpeed = 80, boostMultiplier = 2.0, acceleration = 40 } = {}) {
        this.maxSpeed = maxSpeed;
        this.boostMultiplier = boostMultiplier;
        this.acceleration = acceleration;
        this.velocity = new THREE.Vector3();
    }

    applyForces(object3d, input, dt) {
        const { forward, right, up } = input.move;
        const hasInput = forward !== 0 || right !== 0 || up !== 0;

        if (!hasInput) return;

        const localDir = new THREE.Vector3(right, up, forward).normalize();
        const worldDir = localDir.applyQuaternion(object3d.quaternion);
        const accel = this.acceleration * (input.boost ? this.boostMultiplier : 1);
        this.velocity.addScaledVector(worldDir, accel * dt);
    }

    integrate(object3d, input, dt) {
        const max = this.maxSpeed * (input.boost ? this.boostMultiplier : 1);
        if (this.velocity.lengthSq() > max * max) {
            this.velocity.setLength(max);
        }

        object3d.position.addScaledVector(this.velocity, dt);
    }
}
