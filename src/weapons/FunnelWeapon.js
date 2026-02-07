import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { FunnelDrone } from "../entities/FunnelDrone.js";

export class FunnelWeapon {
    constructor({ owner, world, scene, targeting, count = 3 } = {}) {
        this.owner = owner;
        this.world = world;
        this.scene = scene;
        this.targeting = targeting;
        this.count = count;
        this.inputKey = "funnel";

        this.attackCycles = 3;
        this.cycleInterval = 0.45;
        this.cooldownDuration = 3.0;
        this.orbitRadius = 6;
        this.orbitHeight = 2.0;
        this.orbitSpeed = 1.6;
        this.followRadius = 4.5;
        this.followHeight = 1.2;
        this.followSpeed = 6.0;
        this.returnSpeed = 7.0;
        this.beamDuration = 0.08;
        this.deployArrivalDistance = 1.0;
        this.damage = 6;

        this._state = "idle";
        this._cyclesRemaining = 0;
        this._cycleTimer = 0;
        this._cooldown = 0;
        this._orbitTime = 0;

        this.drones = Array.from({ length: count }, (_, index) => {
            const drone = new FunnelDrone({ scene });
            drone.orbitAngle = (index / count) * Math.PI * 2;
            if (this.world) this.world.add(drone);
            return drone;
        });
    }

    setOwner(owner) {
        this.owner = owner;
    }

    triggerStart() {
        if (this._cooldown > 0 || this._state === "attacking") return;
        const target = this.targeting?.getCurrentTarget();
        if (!target?.group) return;
        this._state = "deploying";
        this._cyclesRemaining = this.attackCycles;
        this._cycleTimer = 0;
        this._orbitTime = 0;
    }

    triggerEnd() {
        return;
    }

    update(dt) {
        if (!this.owner || !this.owner.group) return;

        if (this._cooldown > 0) {
            this._cooldown = Math.max(0, this._cooldown - dt);
        }

        const ownerPos = this.owner.group.getWorldPosition(new THREE.Vector3());
        const ownerQuat = this.owner.group.quaternion;

        this._orbitTime += dt * this.orbitSpeed;

        if (this._state !== "attacking" && this._state !== "deploying") {
            this.drones.forEach((drone, index) => {
                const angle = this._orbitTime + (index / this.count) * Math.PI * 2;
                drone.setMode("dock");
                drone.setHomePosition(
                    ownerPos
                        .clone()
                        .add(
                            new THREE.Vector3(
                                Math.cos(angle) * this.followRadius,
                                this.followHeight,
                                Math.sin(angle) * this.followRadius
                            ).applyQuaternion(ownerQuat)
                        )
                );
                drone.setOrbit({ angle, radius: this.followRadius, height: this.followHeight, lerpSpeed: this.followSpeed });
            });
            return;
        }

        const target = this.targeting?.getCurrentTarget();
        if (!target?.group) {
            this._state = "returning";
        }

        if (target?.group && this._state === "deploying") {
            const targetPos = target.group.getWorldPosition(new THREE.Vector3());
            let allArrived = true;
            this.drones.forEach((drone, index) => {
                const angle = (index / this.count) * Math.PI * 2;
                drone.setMode("orbit");
                drone.setTargetPosition(targetPos);
                drone.setOrbit({ angle, radius: this.orbitRadius, height: this.orbitHeight, lerpSpeed: this.followSpeed });

                const orbitOffset = new THREE.Vector3(
                    Math.cos(angle),
                    Math.sin(angle * 0.7) * this.orbitHeight,
                    Math.sin(angle)
                ).multiplyScalar(this.orbitRadius);
                orbitOffset.y += this.orbitHeight;
                const desired = targetPos.clone().add(orbitOffset);
                if (drone.group.position.distanceTo(desired) > this.deployArrivalDistance) {
                    allArrived = false;
                }
            });

            if (allArrived) {
                this._state = "attacking";
                this._cycleTimer = 0;
            }
        }

        if (this._state === "attacking" && target?.group) {
            const targetPos = target.group.getWorldPosition(new THREE.Vector3());
            this.drones.forEach((drone, index) => {
                const angle = this._orbitTime + (index / this.count) * Math.PI * 2;
                drone.setMode("orbit");
                drone.setTargetPosition(targetPos);
                drone.setOrbit({ angle, radius: this.orbitRadius, height: this.orbitHeight, lerpSpeed: this.followSpeed });
            });

            this._cycleTimer -= dt;
            if (this._cycleTimer <= 0 && this._cyclesRemaining > 0) {
                this._cyclesRemaining -= 1;
                this._cycleTimer = this.cycleInterval;

                this.drones.forEach((drone) => {
                    const origin = drone.group.getWorldPosition(new THREE.Vector3());
                    drone.fireAt(origin, targetPos, this.beamDuration);
                });

                if (typeof target.onDamage === "function") {
                    target.onDamage(this.damage);
                } else if (typeof target.onHit === "function") {
                    target.onHit();
                }

                if (this._cyclesRemaining <= 0) {
                    this._state = "returning";
                    this._cooldown = this.cooldownDuration;
                }
            }
        }

        if (this._state === "returning") {
            this.drones.forEach((drone, index) => {
                const angle = this._orbitTime + (index / this.count) * Math.PI * 2;
                drone.setMode("return");
                drone.setHomePosition(
                    ownerPos
                        .clone()
                        .add(
                            new THREE.Vector3(
                                Math.cos(angle) * this.followRadius,
                                this.followHeight,
                                Math.sin(angle) * this.followRadius
                            ).applyQuaternion(ownerQuat)
                        )
                );
                drone.setOrbit({ angle, radius: this.followRadius, height: this.followHeight, returnSpeed: this.returnSpeed });
            });

            const allDocked = this.drones.every((drone) => drone.mode === "dock");
            if (allDocked) {
                this._state = "idle";
            }
        }
    }
}
