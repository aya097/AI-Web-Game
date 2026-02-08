import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export const createVfxManager = (scene) => {
    const vfxGroup = new THREE.Group();
    scene.add(vfxGroup);
    const vfxInstances = [];

    const addVfxInstance = (instance) => {
        vfxInstances.push(instance);
        instance.meshes?.forEach((mesh) => vfxGroup.add(mesh));
        if (instance.light) vfxGroup.add(instance.light);
    };

    const removeVfxInstance = (instance) => {
        instance.meshes?.forEach((mesh) => vfxGroup.remove(mesh));
        if (instance.light) vfxGroup.remove(instance.light);
    };

    const spawnHitEffect = (position, color = 0x7ad7ff) => {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.8, 2.2, 28),
            new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 2.2,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.copy(position);

        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 16, 16),
            new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 2.6,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        flash.position.copy(position);

        const light = new THREE.PointLight(color, 0, 24, 2);
        light.position.copy(position);

        const duration = 0.7;
        addVfxInstance({
            time: duration,
            duration,
            meshes: [ring, flash],
            light,
            update(dt) {
                this.time = Math.max(0, this.time - dt);
                const t = this.time / this.duration;
                ring.material.opacity = 0.9 * t;
                ring.scale.setScalar(1 + (1 - t) * 3.6);
                ring.rotation.z += dt * 4.5;
                flash.material.opacity = 0.85 * t;
                flash.scale.setScalar(1 + (1 - t) * 5.0);
                light.intensity = 6.0 * t;
            },
        });
    };

    const spawnExplosionEffect = (position, color = 0xff9f9f) => {
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 20, 20),
            new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 3.0,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        core.position.copy(position);

        const shock = new THREE.Mesh(
            new THREE.RingGeometry(1.6, 3.2, 36),
            new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 2.4,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        shock.rotation.x = Math.PI / 2;
        shock.position.copy(position);

        const shockInner = new THREE.Mesh(
            new THREE.RingGeometry(0.6, 1.4, 32),
            new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 2.6,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        shockInner.rotation.x = Math.PI / 2;
        shockInner.position.copy(position);

        const debris = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color,
                size: 0.42,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        const debrisCount = 48;
        const debrisPositions = new Float32Array(debrisCount * 3);
        for (let i = 0; i < debrisCount; i += 1) {
            const r = 1.2 + Math.random() * 3.2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            debrisPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            debrisPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            debrisPositions[i * 3 + 2] = r * Math.cos(phi);
        }
        debris.geometry.setAttribute("position", new THREE.BufferAttribute(debrisPositions, 3));
        debris.position.copy(position);

        const sparks = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: 0xffd2b0,
                size: 0.22,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        const sparkCount = 64;
        const sparkPositions = new Float32Array(sparkCount * 3);
        for (let i = 0; i < sparkCount; i += 1) {
            const r = 0.8 + Math.random() * 2.8;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            sparkPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            sparkPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            sparkPositions[i * 3 + 2] = r * Math.cos(phi);
        }
        sparks.geometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
        sparks.position.copy(position);

        const light = new THREE.PointLight(color, 0, 60, 2);
        light.position.copy(position);

        const duration = 1.8;
        addVfxInstance({
            time: duration,
            duration,
            meshes: [core, shock, shockInner, debris, sparks],
            light,
            update(dt) {
                this.time = Math.max(0, this.time - dt);
                const t = this.time / this.duration;
                core.material.opacity = 1.0 * t;
                core.scale.setScalar(1 + (1 - t) * 8.0);
                shock.material.opacity = 0.9 * t;
                shock.scale.setScalar(1 + (1 - t) * 10.0);
                shock.rotation.z += dt * 3.5;
                shockInner.material.opacity = 0.8 * t;
                shockInner.scale.setScalar(1 + (1 - t) * 7.0);
                shockInner.rotation.z -= dt * 4.2;
                debris.material.opacity = 0.85 * t;
                debris.scale.setScalar(1 + (1 - t) * 7.6);
                sparks.material.opacity = 0.8 * t;
                sparks.scale.setScalar(1 + (1 - t) * 5.2);
                light.intensity = 9.0 * t;
            },
        });
    };

    const system = {
        afterUpdate: ({ dt }) => {
            for (let i = vfxInstances.length - 1; i >= 0; i -= 1) {
                const fx = vfxInstances[i];
                fx.update(dt);
                if (fx.time <= 0) {
                    removeVfxInstance(fx);
                    vfxInstances.splice(i, 1);
                }
            }
        },
    };

    return { spawnHitEffect, spawnExplosionEffect, system };
};
