import { Entity } from "./Entity.js";
import { Vector2 } from "./Vector2.js";
import { Bullet } from "./Bullet.js";

export class Ship extends Entity {
  #hp = 100;

  constructor(position) {
    super({
      position,
      velocity: new Vector2(),
      radius: 28,
      kind: "ship",
    });
    this.angle = 0;
    this.fireCooldown = 0;
  }

  get hp() {
    return this.#hp;
  }

  damage(amount, world) {
    if (this.dead) return;
    this.#hp = Math.max(0, this.#hp - amount);
    if (this.#hp === 0) {
      this.kill();
      world.createExplosion(this.position);
      world.audio?.emit('exploded', { ship: this });
      world.scheduleRespawn(2000);
    }
  }

  heal(amount) {
    this.#hp = Math.min(100, this.#hp + amount);
  }

  fire(world) {
    if (this.dead || this.fireCooldown > 0) return null;

    const nose = Vector2.fromAngle(this.angle, this.radius + 10);
    const bulletPosition = this.position.add(nose);
    const bulletVelocity = Vector2.fromAngle(this.angle, 780).add(this.velocity);

    const bullet = new Bullet(bulletPosition, bulletVelocity, this.id);
    world.spawn(bullet);
    world.audio?.emit('fired', { bullet, ship: this });
    this.fireCooldown = 0.18;
    return bullet;
  }

  update(dt, world) {
    if (this.dead) return;

    const input = world.input;
    const acceleration = 900;
    const friction = 0.92;
    const maxSpeed = 700;

    let accelerationVector = new Vector2();
    if (input.isPressed("w") || input.isPressed("arrowup")) {
      accelerationVector = accelerationVector.add(new Vector2(0, -acceleration));
    }
    if (input.isPressed("s") || input.isPressed("arrowdown")) {
      accelerationVector = accelerationVector.add(new Vector2(0, acceleration));
    }
    if (input.isPressed("a") || input.isPressed("arrowleft")) {
      accelerationVector = accelerationVector.add(new Vector2(-acceleration, 0));
    }
    if (input.isPressed("d") || input.isPressed("arrowright")) {
      accelerationVector = accelerationVector.add(new Vector2(acceleration, 0));
    }

    this.velocity = this.velocity.add(accelerationVector.scale(dt));
    this.velocity = this.velocity.scale(Math.pow(friction, dt * 60));

    if (this.velocity.length() > maxSpeed) {
      this.velocity = this.velocity.normalized().scale(maxSpeed);
    }

    this.position = this.position.add(this.velocity.scale(dt));
    this.position = world.wrap(this.position);

    if (this.velocity.length() > 1) {
      this.angle = Math.atan2(this.velocity.y, this.velocity.x);
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
  }
}
