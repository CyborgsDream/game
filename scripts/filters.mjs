export class OneEuroFilter {
  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = null;
    this.dx = 0;
  }

  alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(value, dt) {
    if (this.x === null) {
      this.x = value;
      return value;
    }
    const dx = (value - this.x) / dt;
    const alphaD = this.alpha(this.dCutoff, dt);
    this.dx = this.dx + alphaD * (dx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    const alpha = this.alpha(cutoff, dt);
    this.x = this.x + alpha * (value - this.x);
    return this.x;
  }

  reset() {
    this.x = null;
    this.dx = 0;
  }
}
