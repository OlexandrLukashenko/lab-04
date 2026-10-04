import { Entity } from "./Entity.js";

export class Particle extends Entity {
  constructor(position, velocity) {
    super({ position, velocity, radius: 2, kind: "particle" });
    this.life = 0.6 + Math.random() * 0.6;
    this.maxLife = this.life;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.kill();
    this.position = this.position.add(this.velocity.scale(dt));
    this.velocity = this.velocity.scale(0.96);
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }
}
