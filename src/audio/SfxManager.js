export class SfxManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
    }

    async unlock() {
        if (this.context) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioCtx();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = 0.26;
        this.masterGain.connect(this.context.destination);
        await this.context.resume();
    }

    _playTone({ frequency = 440, duration = 0.12, type = "sine", gain = 0.2, detune = 0, ramp = 0.02, endFrequency = null }) {
        if (!this.context || !this.masterGain) return;
        const osc = this.context.createOscillator();
        const amp = this.context.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        osc.detune.value = detune;
        amp.gain.value = 0;
        osc.connect(amp);
        amp.connect(this.masterGain);

        const now = this.context.currentTime;
        amp.gain.linearRampToValueAtTime(gain, now + ramp);
        amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        if (endFrequency !== null) {
            osc.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
        }

        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    _playNoise({ duration = 0.2, gain = 0.2, cutoff = 800, ramp = 0.01, highpass = 40 }) {
        if (!this.context || !this.masterGain) return;
        const bufferSize = Math.floor(this.context.sampleRate * duration);
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i += 1) {
            data[i] = (Math.random() * 2 - 1) * 0.6;
        }

        const source = this.context.createBufferSource();
        source.buffer = buffer;

        const hp = this.context.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = highpass;

        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = cutoff;

        const amp = this.context.createGain();
        amp.gain.value = 0;

        source.connect(hp);
        hp.connect(filter);
        filter.connect(amp);
        amp.connect(this.masterGain);

        const now = this.context.currentTime;
        amp.gain.linearRampToValueAtTime(gain, now + ramp);
        amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        source.start(now);
        source.stop(now + duration + 0.02);
    }

    playLaser({ isEnemy = false } = {}) {
        const root = isEnemy ? 200 : 260;
        this._playTone({
            frequency: root,
            endFrequency: root * 1.1,
            duration: 0.18,
            type: "sawtooth",
            gain: 0.22,
            detune: isEnemy ? -180 : 120,
            ramp: 0.015,
        });
        this._playTone({
            frequency: root * 0.45,
            endFrequency: root * 0.7,
            duration: 0.22,
            type: "triangle",
            gain: 0.16,
            detune: -50,
            ramp: 0.025,
        });
        this._playNoise({ duration: 0.06, gain: 0.03, cutoff: 520, highpass: 60 });
    }

    playHit() {
        this._playTone({ frequency: 95, endFrequency: 60, duration: 0.26, type: "triangle", gain: 0.22, detune: -160, ramp: 0.02 });
        this._playNoise({ duration: 0.1, gain: 0.08, cutoff: 650, highpass: 90 });
    }

    playExplosion() {
        this._playTone({ frequency: 45, endFrequency: 24, duration: 1.4, type: "sine", gain: 0.6, detune: -720, ramp: 0.005 });
        this._playTone({ frequency: 70, endFrequency: 35, duration: 0.95, type: "triangle", gain: 0.4, detune: -380, ramp: 0.005 });
        this._playNoise({ duration: 0.9, gain: 0.4, cutoff: 520, highpass: 28 });
        this._playNoise({ duration: 0.55, gain: 0.34, cutoff: 260, highpass: 18 });
    }
}
