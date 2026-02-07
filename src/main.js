import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { InputSystem } from "./systems/InputSystem.js";
import { SixDoFMovement } from "./movement/SixDoFMovement.js";
import { Player } from "./entities/Player.js";
import { Game } from "./core/Game.js";
import { World } from "./core/World.js";
import { HUD } from "./ui/HUD.js";

const SETTINGS = {
    background: 0x05060a,
    camera: {
        fov: 60,
        near: 0.1,
        far: 2000,
        offset: new THREE.Vector3(0, 3, -12),
    },
    grid: {
        size: 400,
        divisions: 80,
        color1: 0x2a3b5f,
        color2: 0x111827,
    },
    stars: {
        count: 1500,
        radius: 900,
        size: 1.2,
    },
    light: {
        directional: { color: 0xffffff, intensity: 1.1, position: [10, 20, 10] },
        ambient: { color: 0x4a4a4a },
    },
};

const overlay = document.getElementById("overlay");
const hud = document.getElementById("hud");

const scene = new THREE.Scene();
scene.background = new THREE.Color(SETTINGS.background);

const camera = new THREE.PerspectiveCamera(
    SETTINGS.camera.fov,
    window.innerWidth / window.innerHeight,
    SETTINGS.camera.near,
    SETTINGS.camera.far
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const input = new InputSystem(renderer.domElement);
renderer.domElement.addEventListener("click", () => {
    renderer.domElement.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
    overlay.style.display = document.pointerLockElement ? "none" : "grid";
});

const light = new THREE.DirectionalLight(
    SETTINGS.light.directional.color,
    SETTINGS.light.directional.intensity
);
light.position.set(...SETTINGS.light.directional.position);
scene.add(light);
scene.add(new THREE.AmbientLight(SETTINGS.light.ambient.color));

const grid = new THREE.GridHelper(
    SETTINGS.grid.size,
    SETTINGS.grid.divisions,
    SETTINGS.grid.color1,
    SETTINGS.grid.color2
);
grid.rotation.x = Math.PI / 2;
scene.add(grid);

const axisHelper = new THREE.AxesHelper(6);
scene.add(axisHelper);

function createStars() {
    const { count, radius, size } = SETTINGS.stars;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
        const r = radius * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        starPositions[i * 3] = x;
        starPositions[i * 3 + 1] = y;
        starPositions[i * 3 + 2] = z;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size, sizeAttenuation: true });
    return new THREE.Points(starGeometry, starMaterial);
}

scene.add(createStars());

const playerMovement = new SixDoFMovement({
    maxSpeed: 80,
    boostMultiplier: 2.0,
    acceleration: 40,
});
const player = new Player(playerMovement);
scene.add(player.group);

const cameraOffset = SETTINGS.camera.offset.clone();
const cameraTarget = new THREE.Vector3();
const cameraOffsetWorld = new THREE.Vector3();

const world = new World();
world.add(player);

const hudView = new HUD(hud, playerMovement);

const playerInputSystem = {
    beforeUpdate: ({ input: inputState }) => {
        player.applyInput(inputState);
    },
};

const cameraFollowSystem = {
    afterUpdate: () => {
        cameraOffsetWorld.copy(cameraOffset).applyQuaternion(player.group.quaternion);
        const desired = player.group.position.clone().add(cameraOffsetWorld);
        camera.position.copy(desired);
        cameraTarget.copy(player.group.position);
        camera.lookAt(cameraTarget);
    },
};

const game = new Game({
    renderer,
    scene,
    camera,
    input,
    world,
    hud: hudView,
    systems: [playerInputSystem, cameraFollowSystem],
});

function animate(time) {
    game.update(time);
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
