// Procedural sound: every effect is synthesized with WebAudio (no audio files).
export class Audio {
  constructor() {
    this.ctx = null; this.enabled = true; this.musicOn = false;
    this.loops = {};
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.7;
      this.filter = this.ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 20000;
      this.master.connect(this.filter).connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      let b = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = i % 2 ? w : b * 3.5; }
      this.startAmbience();
    } catch (e) { this.ctx = null; }
    return this.ctx;
  }
  get t() { return this.ctx.currentTime; }
  tone(freq, dur, type = 'sine', vol = 0.2, delay = 0, slide = 0) {
    const c = this.ensure(); if (!c || !this.enabled) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, this.t + delay);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), this.t + delay + dur);
    g.gain.setValueAtTime(0.0001, this.t + delay);
    g.gain.exponentialRampToValueAtTime(vol, this.t + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + delay + dur);
    o.connect(g).connect(this.master);
    o.start(this.t + delay); o.stop(this.t + delay + dur + 0.05);
  }
  noiseBurst(dur, freq = 1000, q = 1, vol = 0.3, type = 'bandpass', delay = 0, sweep = 0) {
    const c = this.ensure(); if (!c || !this.enabled) return;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, this.t + delay); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, this.t + delay + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, this.t + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + delay + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(this.t + delay, Math.random()); src.stop(this.t + delay + dur + 0.05);
  }
  play(name, opt = {}) {
    if (!this.ensure()) return;
    const v = opt.vol ?? 1;
    switch (name) {
      case 'click': this.tone(1400, 0.04, 'square', 0.06 * v); break;
      case 'beep': this.tone(880, 0.12, 'sine', 0.15 * v); break;
      case 'error': this.tone(220, 0.25, 'square', 0.08 * v); break;
      case 'door': this.noiseBurst(0.25, 300, 0.8, 0.35 * v, 'lowpass'); this.tone(180, 0.35, 'sawtooth', 0.03 * v, 0.02, 1.6); break;
      case 'doorClose': this.noiseBurst(0.15, 200, 0.8, 0.5 * v, 'lowpass'); this.tone(90, 0.2, 'sine', 0.3 * v); break;
      case 'slide': this.noiseBurst(0.6, 2500, 0.7, 0.12 * v, 'bandpass', 0, 0.5); break;
      case 'clunk': this.tone(95, 0.3, 'sine', 0.4 * v, 0, 0.6); this.noiseBurst(0.1, 600, 1, 0.25 * v, 'lowpass'); break;
      case 'splash': this.noiseBurst(0.8, 1800, 0.5, 0.5 * v, 'lowpass', 0, 0.25); this.noiseBurst(0.3, 4000, 1, 0.15 * v, 'highpass', 0.05); break;
      case 'plop': this.tone(500, 0.12, 'sine', 0.2 * v, 0, 2.2); break;
      case 'coin': this.tone(1320, 0.1, 'square', 0.06 * v); this.tone(1760, 0.35, 'square', 0.06 * v, 0.08); break;
      case 'kaching': this.tone(2093, 0.5, 'triangle', 0.15 * v); this.tone(2637, 0.5, 'triangle', 0.1 * v, 0.06); this.noiseBurst(0.15, 5000, 2, 0.15 * v, 'bandpass', 0.1); break;
      case 'ding': this.tone(1568, 1.6, 'sine', 0.3 * v); this.tone(3136, 0.8, 'sine', 0.08 * v); break;
      case 'whoosh': this.noiseBurst(0.7, 400, 0.8, 0.25 * v, 'bandpass', 0, 6); break;
      case 'bounce': this.tone(160, 0.25, 'sine', 0.3 * v, 0, 2.5); break;
      case 'pop': this.noiseBurst(0.05, 3000, 1, 0.2 * v); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'square', 0.06 * v, i * 0.09)); break;
      case 'lose': [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'square', 0.06 * v, i * 0.12)); break;
      case 'strike': this.noiseBurst(0.9, 900, 0.5, 0.6 * v, 'lowpass', 0, 0.4); [0, 0.05, 0.11, 0.16].forEach((d) => this.noiseBurst(0.08, 2500, 3, 0.3 * v, 'bandpass', d)); break;
      case 'roll': this.noiseBurst(1.8, 150, 0.6, 0.35 * v, 'lowpass'); break;
      case 'hiss': this.noiseBurst(1.5, 6000, 0.5, 0.15 * v, 'highpass'); break;
      case 'water': this.noiseBurst(1.5, 3000, 0.3, 0.12 * v, 'bandpass'); break;
      case 'cheer': this.noiseBurst(2.5, 1200, 0.3, 0.35 * v, 'bandpass'); for (let i = 0; i < 8; i++) this.tone(600 + Math.random() * 900, 0.15, 'triangle', 0.03 * v, Math.random() * 1.5, 1.3); break;
      case 'note': { const f = opt.f || 440; this.tone(f, 1.2, 'triangle', 0.18 * v); this.tone(f * 2, 0.6, 'sine', 0.05 * v); break; }
      case 'pluck': { const f = opt.f || 196; this.tone(f, 0.9, 'sawtooth', 0.05 * v); this.tone(f * 1.5, 0.7, 'triangle', 0.05 * v, 0.03); break; }
      case 'clack': this.tone(1800, 0.05, 'square', 0.12 * v); for (let i = 0; i < 6; i++) this.tone(1200 + Math.random() * 1500, 0.04, 'square', 0.05 * v, 0.05 + i * 0.07); break;
      case 'arcade': [660, 880, 990, 1320].forEach((f, i) => this.tone(f, 0.08, 'square', 0.05 * v, i * 0.06)); break;
      case 'steam': this.noiseBurst(1.0, 8000, 0.4, 0.12 * v, 'highpass'); break;
      case 'clank': this.tone(320, 0.25, 'square', 0.06 * v); this.tone(437, 0.3, 'triangle', 0.05 * v, 0.02); break;
      case 'buzz': this.tone(110, 0.4, 'sawtooth', 0.08 * v); break;
      case 'chain': for (let i = 0; i < 10; i++) this.tone(300, 0.03, 'square', 0.03 * v, i * 0.08); break;
      default: this.tone(660, 0.1, 'sine', 0.1 * v);
    }
  }
  // looping sounds (alarm siren, ride rumble, sliding)
  loop(name, on, vol = 0.1) {
    if (!on && !this.ctx) return;
    const c = this.ensure(); if (!c) return;
    const L = this.loops[name];
    if (on && !L) {
      const g = c.createGain(); g.gain.value = 0; g.connect(this.master);
      let src;
      if (name === 'alarm') {
        src = c.createOscillator(); src.type = 'square'; src.frequency.value = 800;
        const lfo = c.createOscillator(); lfo.frequency.value = 2; const lg = c.createGain(); lg.gain.value = 180;
        lfo.connect(lg).connect(src.frequency); lfo.start(); src.lfo = lfo;
        src.connect(g);
      } else {
        src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
        const f = c.createBiquadFilter(); f.type = name === 'rumble' ? 'lowpass' : 'bandpass'; f.frequency.value = name === 'rumble' ? 180 : 1800; f.Q.value = 0.7;
        src.connect(f).connect(g); src.filt = f;
      }
      src.start();
      this.loops[name] = { src, g };
    }
    const l2 = this.loops[name];
    if (l2) {
      l2.g.gain.setTargetAtTime(on ? vol : 0, c.currentTime, 0.1);
      if (!on) { const s = l2.src; delete this.loops[name]; setTimeout(() => { try { s.stop(); if (s.lfo) s.lfo.stop(); } catch (e) { /* stopped */ } }, 400); }
    }
  }
  setLoopRate(name, v) { const l = this.loops[name]; if (l && l.src.filt) l.src.filt.frequency.value = v; }
  // background murmur of the crowd + optional gentle music
  startAmbience() {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
    this.ambGain = c.createGain(); this.ambGain.gain.value = 0.0;
    src.connect(f).connect(this.ambGain).connect(this.master); src.start();
    this.musicTimer = 0;
  }
  update(dt, zone, underwater) {
    if (!this.ctx) return;
    const target = zone === 'concourse' || zone === 'attraction' || zone === 'venue' ? 0.05 : zone === 'store' || zone === 'anchor' ? 0.03 : 0.012;
    this.ambGain.gain.setTargetAtTime(this.enabled ? target : 0, this.ctx.currentTime, 0.5);
    this.filter.frequency.setTargetAtTime(underwater ? 600 : 20000, this.ctx.currentTime, 0.1);
    if (this.musicOn && this.enabled) {
      this.musicTimer -= dt;
      if (this.musicTimer <= 0) {
        this.musicTimer = 2.4;
        const prog = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]];
        this.chord = ((this.chord || 0) + 1) % prog.length;
        prog[this.chord].forEach((f, i) => this.tone(f, 2.6, 'triangle', 0.025, i * 0.02));
        this.tone(prog[this.chord][Math.floor(Math.random() * 3)] * 2, 0.6, 'sine', 0.03, 0.6 + Math.random());
      }
    }
  }
}
