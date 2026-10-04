export function resizeCanvas(canvas, context) {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

function drawBackground(ctx, width, height) {
  ctx.fillStyle = "#07111f";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
}

function drawShip(ctx, ship, assets) {
  ctx.save();
  ctx.translate(ship.position.x, ship.position.y);
  ctx.rotate(ship.angle);
  ctx.strokeStyle = "#8be9fd";
  ctx.lineWidth = 4;
  for (const [x, y] of [[-25,-16],[25,-16],[-25,16],[25,16]]) {
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = "#e6edf3";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-25,-16); ctx.lineTo(25,16);
  ctx.moveTo(25,-16); ctx.lineTo(-25,16);
  ctx.stroke();
  ctx.fillStyle = "#5865f2";
  ctx.beginPath(); ctx.moveTo(22,0); ctx.lineTo(-15,-13); ctx.lineTo(-22,0); ctx.lineTo(-15,13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.beginPath(); ctx.arc(15,0,6,0,Math.PI*2); ctx.fill();
  if (assets?.shipSprite) {
    ctx.drawImage(assets.shipSprite, 0, 0, 32, 32, -32, -32, 64, 64);
  }
  ctx.restore();
}

function drawAsteroid(ctx, asteroid, assets) {
  ctx.save();
  ctx.translate(asteroid.position.x, asteroid.position.y);
  ctx.rotate(asteroid.rotation);
  ctx.fillStyle = "#64748b";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const n = 8;
  for (let i = 0; i < n; i++) {
    const angle = i / n * Math.PI * 2;
    const r = asteroid.radius * (0.8 + (i % 3) * 0.08);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (assets?.asteroidSprite) {
    ctx.drawImage(assets.asteroidSprite, 0, 0, 32, 32, -asteroid.radius, -asteroid.radius, asteroid.radius * 2, asteroid.radius * 2);
  }
  ctx.restore();
}

function drawBullet(ctx, bullet, assets) {
  ctx.save();
  ctx.translate(bullet.position.x, bullet.position.y);
  ctx.fillStyle = bullet.homing ? "#f59e0b" : "#8be9fd";
  ctx.beginPath(); ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2); ctx.fill();
  if (assets?.bulletSprite) {
    const frame = bullet.homing ? 1 : 0;
    ctx.drawImage(assets.bulletSprite, frame * 16, 0, 16, 16, -bullet.radius, -bullet.radius, bullet.radius * 2, bullet.radius * 2);
  }
  ctx.restore();
}

function drawPickup(ctx, pickup) {
  ctx.save();
  ctx.translate(pickup.position.x, pickup.position.y);
  ctx.fillStyle = "#22c55e";
  ctx.strokeStyle = "#bbf7d0";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0,0,pickup.radius,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "white";
  ctx.fillRect(-3,-9,6,18); ctx.fillRect(-9,-3,18,6);
  ctx.restore();
}

function drawParticle(ctx, particle) {
  ctx.save();
  ctx.globalAlpha = particle.alpha;
  ctx.fillStyle = "#fb923c";
  ctx.beginPath(); ctx.arc(particle.position.x, particle.position.y, 3, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

export function render(context, world) {
  context.clearRect(0, 0, world.width, world.height);
  drawBackground(context, world.width, world.height);

  for (const entity of world) {
    if (entity.dead) continue;
    if (entity.kind === "asteroid") drawAsteroid(context, entity, world.assets);
    else if (entity.kind === "bullet") drawBullet(context, entity, world.assets);
    else if (entity.kind === "pickup") drawPickup(context, entity);
    else if (entity.kind === "particle") drawParticle(context, entity);
  }

  for (const ship of world.ofKind("ship")) drawShip(context, ship, world.assets);
}
