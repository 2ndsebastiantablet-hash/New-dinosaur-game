// A small playable arcade game shown when you use any arcade cabinet: "Neon Dodge".
// Steer left/right (A/D, arrows, or tap the sides), dodge falling blocks, grab stars.
export class Arcade {
  constructor(G) {
    this.G = G;
    this.el = document.getElementById('arcade');
    this.cv = document.getElementById('arcade-canvas');
    this.g = this.cv.getContext('2d');
    this.open = false;
    this.best = 0;
    const tap = (e) => { if (!this.open) return; const r = this.cv.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; this.touchDir = x < r.width / 2 ? -1 : 1; };
    this.cv.addEventListener('touchstart', tap, { passive: true });
    this.cv.addEventListener('touchend', () => { this.touchDir = 0; });
    this.cv.addEventListener('mousedown', tap); window.addEventListener('mouseup', () => { this.touchDir = 0; });
    document.getElementById('arcade-close').onclick = () => this.stop();
  }
  start() {
    this.open = true; this.el.style.display = 'flex';
    if (document.pointerLockElement) document.exitPointerLock();
    this.x = 0.5; this.blocks = []; this.stars = []; this.t = 0; this.score = 0; this.alive = true; this.spawn = 0; this.touchDir = 0;
    this.G.audio.play('arcade');
  }
  stop() {
    this.open = false; this.el.style.display = 'none';
    this.G.flash(this.score ? `Arcade score: ${this.score} (best ${this.best})` : 'Game over');
    this.G.resume();
  }
  update(dt, keys) {
    if (!this.open) return;
    const g = this.g, W = this.cv.width, H = this.cv.height;
    if (this.alive) {
      const dir = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + this.touchDir;
      this.x = Math.max(0.05, Math.min(0.95, this.x + dir * dt * 0.9));
      this.t += dt; this.spawn -= dt;
      const speed = 0.35 + this.t * 0.02;
      if (this.spawn <= 0) {
        this.spawn = Math.max(0.18, 0.6 - this.t * 0.01);
        this.blocks.push({ x: Math.random(), y: -0.05, w: 0.06 + Math.random() * 0.12 });
        if (Math.random() < 0.3) this.stars.push({ x: Math.random(), y: -0.05 });
      }
      for (const b of this.blocks) b.y += speed * dt;
      for (const s of this.stars) s.y += speed * 0.8 * dt;
      this.blocks = this.blocks.filter((b) => b.y < 1.1);
      for (const b of this.blocks) if (b.y > 0.86 && b.y < 0.94 && Math.abs(b.x - this.x) < b.w / 2 + 0.03) { this.alive = false; this.G.audio.play('lose'); this.best = Math.max(this.best, this.score); }
      this.stars = this.stars.filter((s) => {
        if (s.y > 0.85 && s.y < 0.95 && Math.abs(s.x - this.x) < 0.05) { this.score += 10; this.G.audio.play('coin', { vol: 0.5 }); return false; }
        return s.y < 1.1;
      });
      this.score += Math.round(dt * 10 * 100) / 100 > 0 ? 0 : 0;
      this.scoreT = (this.scoreT || 0) + dt; if (this.scoreT > 0.5) { this.scoreT = 0; this.score += 1; }
    }
    // draw
    g.fillStyle = '#07051a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(80,60,200,0.35)';
    for (let i = 0; i < 12; i++) { const y = ((i / 12 + this.t * 0.3) % 1) * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.shadowBlur = 12;
    for (const b of this.blocks) { g.fillStyle = g.shadowColor = '#ff2bd6'; g.fillRect((b.x - b.w / 2) * W, b.y * H, b.w * W, 0.035 * H); }
    for (const s of this.stars) { g.fillStyle = g.shadowColor = '#ffe02b'; g.beginPath(); g.arc(s.x * W, s.y * H, 7, 0, 7); g.fill(); }
    g.fillStyle = g.shadowColor = '#2bf0ff';
    g.beginPath(); g.moveTo(this.x * W, 0.87 * H); g.lineTo(this.x * W - 14, 0.93 * H); g.lineTo(this.x * W + 14, 0.93 * H); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#fff'; g.font = 'bold 18px monospace'; g.fillText(`SCORE ${this.score}`, 12, 26); g.fillText(`BEST ${this.best}`, W - 120, 26);
    if (!this.alive) {
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff2bd6'; g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.fillText('GAME OVER', W / 2, H / 2 - 10);
      g.fillStyle = '#fff'; g.font = '16px monospace'; g.fillText('Space: play again · E / Esc: leave', W / 2, H / 2 + 22); g.textAlign = 'left';
      if (keys.has('Space')) this.start();
    }
  }
}
