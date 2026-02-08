export class InputSystem {
    constructor(domElement) {
        this.domElement = domElement;
        this.keys = new Set();
        this.mouseDelta = { x: 0, y: 0 };
        this.pointerLocked = false;
        this.mouseDown = false;

        this._onKeyDown = (event) => {
            this.keys.add(event.code);
        };
        this._onKeyUp = (event) => {
            this.keys.delete(event.code);
        };
        this._onMouseMove = (event) => {
            if (!this.pointerLocked && !this.mouseDown) return;
            this.mouseDelta.x += event.movementX;
            this.mouseDelta.y += event.movementY;
        };
        this._onMouseDown = () => {
            this.mouseDown = true;
        };
        this._onMouseUp = () => {
            this.mouseDown = false;
        };
        this._onPointerLockChange = () => {
            this.pointerLocked = document.pointerLockElement === this.domElement;
        };

        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
        window.addEventListener("mousemove", this._onMouseMove);
        window.addEventListener("mousedown", this._onMouseDown);
        window.addEventListener("mouseup", this._onMouseUp);
        document.addEventListener("pointerlockchange", this._onPointerLockChange);
    }

    dispose() {
        window.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("keyup", this._onKeyUp);
        window.removeEventListener("mousemove", this._onMouseMove);
        window.removeEventListener("mousedown", this._onMouseDown);
        window.removeEventListener("mouseup", this._onMouseUp);
        document.removeEventListener("pointerlockchange", this._onPointerLockChange);
    }

    consumeMouseDelta() {
        const delta = { ...this.mouseDelta };
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        return delta;
    }

    getState() {
        const forward = (this.keys.has("KeyW") ? 1 : 0) + (this.keys.has("KeyS") ? -1 : 0);
        const right = (this.keys.has("KeyA") ? 1 : 0) + (this.keys.has("KeyD") ? -1 : 0);
        const up = (this.keys.has("Space") ? 1 : 0) + (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? -1 : 0);
        const roll = (this.keys.has("KeyE") ? 1 : 0) + (this.keys.has("KeyQ") ? -1 : 0);
        const boost = this.keys.has("KeyV");
        const fire = this.mouseDown;
        const lockOn = this.keys.has("KeyR");
        const funnel = this.keys.has("KeyF");
        const mouseDelta = this.consumeMouseDelta();

        return {
            move: { forward, right, up },
            roll,
            boost,
            fire,
            lockOn,
            funnel,
            mouseDelta,
        };
    }
}
