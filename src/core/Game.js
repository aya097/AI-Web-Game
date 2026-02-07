export class Game {
    constructor({ renderer, scene, camera, input, world, hud, systems = [] }) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.input = input;
        this.world = world;
        this.hud = hud;
        this.systems = systems;
        this.fixedTimeStep = 1 / 60;
        this.maxTimeStep = 1 / 15;
        this.accumulator = 0;
        this.lastTime = performance.now();
    }

    update(time) {
        const delta = Math.min((time - this.lastTime) / 1000, this.maxTimeStep);
        this.lastTime = time;
        this.accumulator += delta;

        while (this.accumulator >= this.fixedTimeStep) {
            this.step(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }

        this.render();
    }

    step(dt) {
        const inputState = this.input.getState();

        this.systems.forEach((system) => {
            if (typeof system.beforeUpdate === "function") {
                system.beforeUpdate({ input: inputState, world: this.world, dt });
            }
        });

        this.systems.forEach((system) => {
            if (typeof system.update === "function") {
                system.update({ input: inputState, world: this.world, dt });
            }
        });

        this.world.update(dt);

        this.systems.forEach((system) => {
            if (typeof system.afterUpdate === "function") {
                system.afterUpdate({ input: inputState, world: this.world, dt });
            }
        });

        if (this.hud) {
            this.hud.render({ world: this.world, input: inputState, dt });
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
