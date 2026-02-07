export class HUD {
    constructor(element, playerMovement) {
        this.element = element;
        this.playerMovement = playerMovement;
    }

    render() {
        if (!this.element || !this.playerMovement) return;
        const speed = this.playerMovement.velocity.length().toFixed(1);
        this.element.textContent = `Speed: ${speed} m/s`;
    }
}
