import { Vector2 } from "./Vector2.js";
import { Asteroid } from "./Asteroid.js";
import { Particle } from "./Particle.js";
import { Pickup } from "./Pickup.js";
import { processCollisions } from "./CollisionSystem.js";

export class World {
  constructor(width, height, input) {
    this.width = width;
    this.height = height;
    this.input = input;
    this.entities = new Map();
    this.score = 0;
    this.respawnTimer = null;
    this.respawnPosition = new Vector2(width / 2, height / 2);
  }

  spawn(entity) {
    this.entities.set(entity.id, entity);
    return entity;
  }

  despawn(entityOrId) {
    const id = typeof entityOrId === "number" ? entityOrId : entityOrId.id;
    const entity = this.entities.get(id);
    if (entity) entity.dead = true;
  }

  *[Symbol.iterator]() {
    yield* this.entities.values();
  }

  *ofKind(kind) {
    for (const entity of this.entities.values()) {
      if (!entity.dead && entity.kind === kind) yield entity;
    }
  }

  wrap(position) {
    return new Vector2(
      (position.x + this.width) % this.width,
      (position.y + this.height) % this.height,
    );
  }

  step(dt) {
    for (const entity of this.entities.values()) {
      if (!entity.dead) entity.update(dt, this);
    }

    processCollisions(this);
    this.spawnRandomPickup();

    if (this.respawnTimer !== null) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawnTimer = null;
        this.respawnShip();
      }
    }

    this.sweep();
  }

  sweep() {
    for (const [id, entity] of this.entities) {
      if (entity.dead) this.entities.delete(id);
    }
  }

  createExplosion(position) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 260;
      this.spawn(new Particle(position, Vector2.fromAngle(angle, speed)));
    }
  }

  scheduleRespawn(delayMs) {
    if (this.respawnTimer === null) this.respawnTimer = delayMs / 1000;
  }

  respawnShip() {
    const ship = this.createShip();
    this.spawn(ship);
  }

  createShip() {
    // Імпорт тут не потрібен: створюється через callback, встановлений main.js.
    return this.shipFactory(this.respawnPosition);
  }

  spawnRandomPickup() {
    if (Math.random() > 0.004 || [...this.ofKind("pickup")].length >= 2) return;
    const position = new Vector2(
      50 + Math.random() * Math.max(1, this.width - 100),
      50 + Math.random() * Math.max(1, this.height - 100),
    );
    this.spawn(new Pickup(position, "heal"));
  }

  seedAsteroids(count = 8) {
    for (let i = 0; i < count; i++) {
      const position = new Vector2(Math.random() * this.width, Math.random() * this.height);
      const velocity = Vector2.fromAngle(Math.random() * Math.PI * 2, 30 + Math.random() * 70);
      this.spawn(new Asteroid(position, velocity, 18 + Math.random() * 18));
    }
  }
}
