export class Entity {
  static #nextId = 1;

  #id;

  constructor({ position, velocity, radius = 10, kind = "entity" } = {}) {
    this.#id = Entity.#nextId++;
    this.position = position;
    this.velocity = velocity;
    this.radius = radius;
    this.kind = kind;
    this.dead = false;
  }

  get id() {
    return this.#id;
  }

  update(_dt, _world) {
    // Базова сутність не має власної поведінки.
  }

  kill() {
    this.dead = true;
  }
}
