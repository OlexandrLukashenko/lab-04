import { Entity } from "./Entity.js";
import { Vector2 } from "./Vector2.js";

export class Bullet extends Entity {
  constructor(position, velocity, ownerId, { homing = false } = {}) {
    super({ position, velocity, radius: 5, kind: "bullet" });
    this.ownerId = ownerId;
    this.ttl = 1.8;
    this.homing = homing;
    this.damage = 25;
  }

  update(dt, world) {
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.kill();
      return;
    }

    if (this.homing) {
      const target = [...world.ofKind("asteroid")][0];
      if (target) {
        const desired = target.position.sub(this.position).normalized();
        const speed = this.velocity.length();
        this.velocity = this.velocity.add(desired.scale(420 * dt)).normalized().scale(speed || 500);
      }
    }

    this.position = this.position.add(this.velocity.scale(dt));

    if (
      this.position.x < -50 || this.position.x > world.width + 50 ||
      this.position.y < -50 || this.position.y > world.height + 50
    ) {
      this.kill();
    }
  }
}
