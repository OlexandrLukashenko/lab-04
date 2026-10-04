import { Entity } from "./Entity.js";

export class Pickup extends Entity {
  constructor(position, type = "heal") {
    super({ position, velocity: { x: 0, y: 0 }, radius: 14, kind: "pickup" });
    this.type = type;
    this.life = 12;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.kill();
  }

  collect(ship) {
    if (this.type === "heal") ship.heal(20);
    this.kill();
  }
}
