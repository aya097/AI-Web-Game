import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class HUD {
    constructor(element, { player, movement, targeting }) {
        this.element = element;
        this.player = player;
        this.movement = movement;
        this.targeting = targeting;
    }

    render() {
        if (!this.element || !this.movement || !this.player) return;
        const speed = this.movement.velocity.length().toFixed(1);
        const hp = Math.max(0, this.player.hp).toFixed(0);
        const shield = Math.max(0, this.player.shield).toFixed(0);
        let lockText = "None";
        const target = this.targeting?.getCurrentTarget();
        if (target?.group) {
            const distance = target.group
                .getWorldPosition(new THREE.Vector3())
                .distanceTo(this.player.group.getWorldPosition(new THREE.Vector3()))
                .toFixed(1);
            if (typeof target.hp === "number") {
                const maxHp = typeof target.maxHp === "number" ? target.maxHp : target.hp;
                lockText = `${target.name || "Target"} (${distance}m) HP:${Math.max(0, target.hp).toFixed(0)}/${maxHp}`;
            } else {
                lockText = `${target.name || "Target"} (${distance}m)`;
            }
        }
        this.element.textContent = `Speed: ${speed} m/s | HP: ${hp}/${this.player.maxHp} | Shield: ${shield}/${this.player.maxShield} | Lock: ${lockText}`;
    }
}
