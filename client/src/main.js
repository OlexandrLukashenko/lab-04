import './style.css';
import { createInput } from './input.js';
import { createLoop } from './loop.js';
import { resizeCanvas, render } from './render.js';
import { World } from './World.js';
import { Ship } from './Ship.js';
import { Vector2 } from './Vector2.js';
import { Bullet } from './Bullet.js';
import { loadManifest } from './assets.js';
import { AudioBus } from './audio.js';
import { Lobby } from './lobby.js';
import { createLobbyDom } from './lobbyDom.js';
import { showLoading } from './loading.js';

const root = document.querySelector('#app');
const canvas = document.querySelector('#gameCanvas');
const context = canvas.getContext('2d');
canvas.hidden = true;
const audio = new AudioBus();
const lobby = new Lobby();
const lobbyUi = createLobbyDom(root, lobby);
const chat = document.createElement('div');
chat.className = 'chat';
chat.innerHTML = '<div class="chat-log" id="chatLog"></div><form id="chatForm"><input id="chatInput" maxlength=500 placeholder="Повідомлення…"><button>Send</button></form>';
root.append(chat);
chat.hidden = true;
const chatLog = chat.querySelector('#chatLog');
lobby.addEventListener('chat', ({detail}) => { const row=document.createElement('div'); row.textContent=`${detail.name}: ${detail.text}`; chatLog.append(row); chatLog.scrollTop=chatLog.scrollHeight; });
lobby.addEventListener('system', ({detail}) => { const row=document.createElement('div'); row.textContent=`[system] ${detail.text}`; chatLog.append(row); });
chat.querySelector('#chatForm').addEventListener('submit', e => { e.preventDefault(); const input=chat.querySelector('#chatInput'); if(input.value.trim()){ lobby.chat(input.value.trim()); input.value=''; } });
const loading = showLoading(root);
let pendingStart = null;
let assets;

async function loadGameAssets() {
  try {
    assets = await loadManifest(new AbortController().signal, p => loading.setProgress(p), audio.context);
    audio.setBuffers({ shot: assets.shot, hit: assets.hit, explosion: assets.explosion });
    loading.remove();
    lobby.start();
    lobby.addEventListener('join', ({ detail }) => {
      lobbyUi.destroy();
      chat.hidden = false;
      startGame(assets, detail.room.config);
    }, { once: true });
  } catch (error) {
    loading.setError(error);
  }
}
loading.onRetry(loadGameAssets);
loadGameAssets();

function startGame(loaded, arenaConfig = { asteroids: 8, difficulty: 1 }) {
  canvas.hidden = false;
  const input = createInput();
  const arena = { width: window.innerWidth, height: window.innerHeight };
  const world = new World(arena.width, arena.height, input);
  world.assets = loaded;
  world.audio = audio;
  world.shipFactory = position => new Ship(position);
  world.arenaConfig = arenaConfig;

  function resize() {
    const size = resizeCanvas(canvas, context);
    arena.width = size.width; arena.height = size.height;
    world.width = size.width; world.height = size.height;
  }
  resize();
  window.addEventListener('resize', resize);

  const ship = new Ship(new Vector2(arena.width / 2, arena.height / 2));
  world.spawn(ship);
  world.seedAsteroids(world.arenaConfig.asteroids);

  const fire = () => { const current = [...world.ofKind('ship')][0]; if (current) current.fire(world); };
  window.addEventListener('keydown', event => {
    if (event.code === 'Space') fire();
    if (event.code === 'KeyH') {
      const current = [...world.ofKind('ship')][0];
      if (current) world.spawn(new Bullet(current.position.add(Vector2.fromAngle(current.angle, 38)), Vector2.fromAngle(current.angle, 500), current.id, { homing: true }));
    }
  });

  let enemyFireTimer = 2.5;
  function update(dt) {
    enemyFireTimer -= dt;
    const currentShip = [...world.ofKind('ship')][0];
    if (enemyFireTimer <= 0 && currentShip) {
      enemyFireTimer = 2.5;
      const side = Math.floor(Math.random() * 4);
      const position = side === 0 ? new Vector2(20, Math.random() * world.height) : side === 1 ? new Vector2(world.width - 20, Math.random() * world.height) : side === 2 ? new Vector2(Math.random() * world.width, 20) : new Vector2(Math.random() * world.width, world.height - 20);
      world.spawn(new Bullet(position, currentShip.position.sub(position).normalized().scale(280), -1));
    }
    world.step(dt);
    document.querySelector('#hp').textContent = currentShip?.hp ?? 0;
    document.querySelector('#score').textContent = world.score;
    document.querySelector('#entities').textContent = world.entities.size;
  }
  createLoop({ update, render: () => render(context, world), onStats(stats) {
    document.querySelector('#steps').textContent = stats.stepsPerSecond;
    document.querySelector('#fps').textContent = stats.framesPerSecond;
    document.querySelector('#frameTime').textContent = stats.frameTime.toFixed(2);
  }});
  document.querySelector('#message').textContent = 'Керування: WASD / стрілки · SPACE — fire · H — homing';
  window.addEventListener('pointerdown', () => audio.resumeFromGesture(), { once: true });
  window.addEventListener('keydown', () => audio.resumeFromGesture(), { once: true });
}
