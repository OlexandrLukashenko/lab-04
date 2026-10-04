export function circleCollision(a, b) {
  return a.position.distanceTo(b.position) <= a.radius + b.radius;
}

export function processCollisions(world) {
  const entities = [...world.entities.values()].filter((entity) => !entity.dead);

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];
      if (a.dead || b.dead || !circleCollision(a, b)) continue;

      if (a.kind === "bullet" && b.kind === "asteroid") {
        b.damage(a.damage, world);
        world.audio?.emit('hit', { target: b });
        a.kill();
      } else if (b.kind === "bullet" && a.kind === "asteroid") {
        a.damage(b.damage, world);
        world.audio?.emit('hit', { target: a });
        b.kill();
      } else if (a.kind === "bullet" && b.kind === "ship" && a.ownerId !== b.id) {
        b.damage(a.damage, world);
        world.audio?.emit('hit', { target: b });
        a.kill();
      } else if (b.kind === "bullet" && a.kind === "ship" && b.ownerId !== a.id) {
        a.damage(b.damage, world);
        world.audio?.emit('hit', { target: a });
        b.kill();
      } else if (a.kind === "ship" && b.kind === "pickup") {
        b.collect(a);
        world.score += 5;
      } else if (b.kind === "ship" && a.kind === "pickup") {
        a.collect(b);
        world.score += 5;
      }
    }
  }
}
