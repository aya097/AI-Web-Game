import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class HUD {
    constructor(element, { player, movement, targeting, funnelWeapon = null, bazookaWeapon = null, weaponState = null, gameState = null }) {
        this.element = element;
        this.player = player;
        this.movement = movement;
        this.targeting = targeting;
        this.funnelWeapon = funnelWeapon;
        this.bazookaWeapon = bazookaWeapon;
        this.weaponState = weaponState;
        this.gameState = gameState;

        if (this.element) {
            this.element.innerHTML = `
                <div class="hud-left">
                    <div class="hud-brand">GUNFRAME</div>
                    <div class="hud-stat"><span class="label">SPD</span><span class="value" data-hud="speed">0.0</span></div>
                    <div class="hud-stat"><span class="label">FNL CD</span><span class="value" data-hud="funnel-cd">0.0</span></div>
                    <div class="hud-stat"><span class="label">WPN</span><span class="value" data-hud="weapon-mode">BEAM</span></div>
                    <div class="hud-stat"><span class="label">BZK</span><span class="value" data-hud="bazooka-status">READY 5</span></div>
                    <div class="hud-bar" data-hud="hp">
                        <span class="fill" data-hud="hp-fill"></span>
                        <span class="text" data-hud="hp-text">HP 0/0</span>
                    </div>
                    <div class="hud-bar shield" data-hud="shield">
                        <span class="fill" data-hud="shield-fill"></span>
                        <span class="text" data-hud="shield-text">SH 0/0</span>
                    </div>
                    <div class="hud-bar boost" data-hud="boost">
                        <span class="fill" data-hud="boost-fill"></span>
                        <span class="text" data-hud="boost-text">BST 0%</span>
                    </div>
                </div>
                <div class="hud-right">
                    <div class="hud-score" data-hud="score">SCORE 000000</div>
                    <div class="hud-lives" data-hud="lives">LIVES 3</div>
                    <div class="hud-time" data-hud="time">TIME 000.0</div>
                    <div class="hud-kills" data-hud="kills">KILLS 0</div>
                    <div class="hud-respawn" data-hud="respawn"></div>
                    <div class="hud-result" data-hud="result"></div>
                </div>
                <div class="hud-lock-panel" data-hud="lock-panel">
                    <div class="hud-lock-title">LOCK ON</div>
                    <div class="hud-lock-name" data-hud="lock-name">NONE</div>
                    <div class="hud-lock-distance" data-hud="lock-distance">-- m</div>
                    <div class="hud-lock-bar">
                        <span class="fill" data-hud="lock-hp-fill"></span>
                    </div>
                    <div class="hud-lock-hp" data-hud="lock-hp">HP -- / --</div>
                    <div class="hud-lock-bar shield">
                        <span class="fill" data-hud="lock-shield-fill"></span>
                    </div>
                    <div class="hud-lock-hp" data-hud="lock-shield">SH -- / --</div>
                </div>
                <div class="hud-funnel" data-hud="funnel">
                    <div class="hud-funnel-key">F</div>
                    <div class="hud-funnel-icon">
                        <span class="drone"></span>
                        <span class="ring"></span>
                    </div>
                    <div class="hud-funnel-cd">
                        <span class="fill" data-hud="funnel-cd-fill"></span>
                        <span class="text" data-hud="funnel-cd-text">READY</span>
                    </div>
                </div>
                <div class="hud-log" data-hud="log"></div>
            `;

            this.speedEl = this.element.querySelector('[data-hud="speed"]');
            this.funnelCdEl = this.element.querySelector('[data-hud="funnel-cd"]');
            this.weaponModeEl = this.element.querySelector('[data-hud="weapon-mode"]');
            this.bazookaStatusEl = this.element.querySelector('[data-hud="bazooka-status"]');
            this.hpFillEl = this.element.querySelector('[data-hud="hp-fill"]');
            this.hpTextEl = this.element.querySelector('[data-hud="hp-text"]');
            this.shieldFillEl = this.element.querySelector('[data-hud="shield-fill"]');
            this.shieldTextEl = this.element.querySelector('[data-hud="shield-text"]');
            this.boostFillEl = this.element.querySelector('[data-hud="boost-fill"]');
            this.boostTextEl = this.element.querySelector('[data-hud="boost-text"]');
            this.scoreEl = this.element.querySelector('[data-hud="score"]');
            this.livesEl = this.element.querySelector('[data-hud="lives"]');
            this.timeEl = this.element.querySelector('[data-hud="time"]');
            this.killsEl = this.element.querySelector('[data-hud="kills"]');
            this.respawnEl = this.element.querySelector('[data-hud="respawn"]');
            this.resultEl = this.element.querySelector('[data-hud="result"]');
            this.lockPanelEl = this.element.querySelector('[data-hud="lock-panel"]');
            this.lockNameEl = this.element.querySelector('[data-hud="lock-name"]');
            this.lockDistanceEl = this.element.querySelector('[data-hud="lock-distance"]');
            this.lockHpFillEl = this.element.querySelector('[data-hud="lock-hp-fill"]');
            this.lockHpEl = this.element.querySelector('[data-hud="lock-hp"]');
            this.lockShieldFillEl = this.element.querySelector('[data-hud="lock-shield-fill"]');
            this.lockShieldEl = this.element.querySelector('[data-hud="lock-shield"]');
            this.funnelCdFillEl = this.element.querySelector('[data-hud="funnel-cd-fill"]');
            this.funnelCdTextEl = this.element.querySelector('[data-hud="funnel-cd-text"]');
            this.logEl = this.element.querySelector('[data-hud="log"]');
        }
    }

    render() {
        if (!this.element || !this.movement || !this.player) return;
        const speed = this.movement.velocity.length().toFixed(1);
        const hp = Math.max(0, this.player.hp).toFixed(0);
        const shield = Math.max(0, this.player.shield).toFixed(0);
        let lockName = "NONE";
        let lockDistance = "--";
        let lockHpText = "HP -- / --";
        let lockHpRatio = 0;
        let lockShieldText = "SH -- / --";
        let lockShieldRatio = 0;
        const target = this.targeting?.getCurrentTarget();
        if (target?.group) {
            const distance = target.group
                .getWorldPosition(new THREE.Vector3())
                .distanceTo(this.player.group.getWorldPosition(new THREE.Vector3()))
                .toFixed(1);
            lockName = target.name || "TARGET";
            lockDistance = `${distance} m`;
            if (typeof target.hp === "number") {
                const maxHp = typeof target.maxHp === "number" ? target.maxHp : target.hp;
                lockHpText = `HP ${Math.max(0, target.hp).toFixed(0)} / ${maxHp}`;
                lockHpRatio = Math.max(0, Math.min(1, target.hp / maxHp));
                if (typeof target.shield === "number") {
                    const maxShield = typeof target.maxShield === "number" ? target.maxShield : target.shield;
                    lockShieldText = `SH ${Math.max(0, target.shield).toFixed(0)} / ${maxShield}`;
                    lockShieldRatio = maxShield > 0 ? Math.max(0, Math.min(1, target.shield / maxShield)) : 0;
                }
            } else {
                lockHpText = "HP -- / --";
                lockHpRatio = 0.2;
            }
        }

        if (this.speedEl) this.speedEl.textContent = `${speed}`;
        if (this.funnelCdEl) {
            const cooldown = this.funnelWeapon?._cooldown ?? 0;
            this.funnelCdEl.textContent = cooldown > 0 ? cooldown.toFixed(1) : "READY";
        }

        if (this.weaponModeEl) {
            const mode = this.weaponState?.mode === "bazooka" ? "BAZOOKA" : "BEAM";
            this.weaponModeEl.textContent = mode;
        }
        if (this.bazookaStatusEl) {
            if (!this.bazookaWeapon) {
                this.bazookaStatusEl.textContent = "--";
            } else if (this.bazookaWeapon.reloadTimer > 0) {
                this.bazookaStatusEl.textContent = `RELOAD ${this.bazookaWeapon.reloadTimer.toFixed(1)}`;
            } else {
                this.bazookaStatusEl.textContent = `READY ${this.bazookaWeapon.shotsRemaining ?? 0}`;
            }
        }

        if (this.hpFillEl) {
            const hpRatio = Math.max(0, Math.min(1, this.player.hp / this.player.maxHp));
            this.hpFillEl.style.width = `${(hpRatio * 100).toFixed(1)}%`;
        }
        if (this.hpTextEl) this.hpTextEl.textContent = `HP ${hp}/${this.player.maxHp}`;

        if (this.shieldFillEl) {
            const shieldRatio = Math.max(0, Math.min(1, this.player.shield / this.player.maxShield));
            this.shieldFillEl.style.width = `${(shieldRatio * 100).toFixed(1)}%`;
        }
        if (this.shieldTextEl) this.shieldTextEl.textContent = `SH ${shield}/${this.player.maxShield}`;

        if (this.boostFillEl || this.boostTextEl) {
            const maxBoost = this.player.maxBoostFuel ?? 0;
            const boost = this.player.boostFuel ?? 0;
            const boostRatio = maxBoost > 0 ? Math.max(0, Math.min(1, boost / maxBoost)) : 0;
            if (this.boostFillEl) this.boostFillEl.style.width = `${(boostRatio * 100).toFixed(1)}%`;
            if (this.boostTextEl) this.boostTextEl.textContent = `BST ${(boostRatio * 100).toFixed(0)}%`;
        }

        if (this.scoreEl && this.gameState) {
            const score = String(this.gameState.score ?? 0).padStart(6, "0");
            this.scoreEl.textContent = `SCORE ${score}`;
        }
        if (this.livesEl && this.gameState) this.livesEl.textContent = `LIVES ${this.gameState.lives ?? 0}`;
        if (this.timeEl && this.gameState) {
            const time = (this.gameState.elapsedTime ?? 0).toFixed(1).padStart(5, "0");
            this.timeEl.textContent = `TIME ${time}`;
        }
        if (this.killsEl && this.gameState) this.killsEl.textContent = `KILLS ${this.gameState.kills ?? 0}`;
        if (this.respawnEl && this.gameState) {
            this.respawnEl.textContent = this.gameState.isRespawning
                ? `RESPAWN ${Math.ceil(this.gameState.respawnTimer ?? 0)}`
                : "";
        }
        if (this.resultEl) this.resultEl.textContent = this.gameState?.result || "";
        if (this.lockPanelEl) {
            this.lockPanelEl.classList.toggle("empty", !target);
        }
        if (this.lockNameEl) this.lockNameEl.textContent = lockName;
        if (this.lockDistanceEl) this.lockDistanceEl.textContent = lockDistance;
        if (this.lockHpEl) this.lockHpEl.textContent = lockHpText;
        if (this.lockHpFillEl) this.lockHpFillEl.style.width = `${(lockHpRatio * 100).toFixed(1)}%`;
        if (this.lockShieldEl) this.lockShieldEl.textContent = lockShieldText;
        if (this.lockShieldFillEl) this.lockShieldFillEl.style.width = `${(lockShieldRatio * 100).toFixed(1)}%`;

        if (this.funnelCdFillEl || this.funnelCdTextEl) {
            const cooldown = this.funnelWeapon?._cooldown ?? 0;
            const max = this.funnelWeapon?.cooldownDuration ?? 0;
            const ratio = max > 0 ? Math.max(0, Math.min(1, cooldown / max)) : 0;
            if (this.funnelCdFillEl) this.funnelCdFillEl.style.height = `${(ratio * 100).toFixed(1)}%`;
            if (this.funnelCdTextEl) this.funnelCdTextEl.textContent = cooldown > 0 ? cooldown.toFixed(1) : "READY";
        }

        if (this.logEl && this.gameState?.logs) {
            const lines = this.gameState.logs.slice(-5).map((entry) => {
                if (typeof entry === "string") return `<div>${entry}</div>`;
                const color = entry.color ? ` style=\"color:${entry.color}\"` : "";
                return `<div${color}>${entry.message}</div>`;
            }).join("");
            this.logEl.innerHTML = lines;
        }
    }
}
