import { Entity } from "./Entity.js";
import { Vector2 } from "./Vector2.js";

export class Asteroid extends Entity {
  constructor(position, velocity, radius = 22) {
    super({ position, velocity, radius, kind: "asteroid" });
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 1.5;
    this.hp = 25;
  }

  update(dt, world) {
    this.position = this.position.add(this.velocity.scale(dt));
    this.position = world.wrap(this.position);
    this.rotation += this.rotationSpeed * dt;
  }

  damage(amount, world) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.kill();
      world.score += 10;
      world.createExplosion(this.position);
    }
  }
}
