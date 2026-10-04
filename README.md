# Лабораторна робота №4 — Node.js: EventEmitter, streams, WebSocket

## FPV Drone Arena

Це продовження лабораторних 1–3. Ігровий цикл, корабель, кулі, астероїди, колізії, асинхронне завантаження ассетів і Lobby збережені. У Лабораторній №4 додається Node.js-сервер: кімнати, join/leave, чат і журнал матчу. Координати корабля сервер не передає — це буде в Лабораторній №5.

## Структура

```text
lab-04/
├── client/
│   ├── src/                 # код браузерної гри
│   ├── public/assets/       # ассети
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── server.js        # node:http + WebSocket
│   │   ├── config.js        # ENV-конфіг
│   │   ├── rooms.js         # EventEmitter / Room
│   │   ├── client.js
│   │   └── matchLog.js      # Transform + pipeline + NDJSON
│   └── package.json
└── package.json             # npm workspaces
```

## Запуск

```bash
npm install
npm run dev
```

Vite працює на `http://localhost:5173`, Node-сервер — на `http://localhost:3000`.

У production:

```bash
npm run build
npm start
```

Після `npm run build` Node-сервер віддає `client/dist`.

### ENV

```text
PORT=3000
LOG_DIR=./logs
CLIENT_DIR=./client/dist
MAX_MESSAGE_BYTES=4096
JOIN_TIMEOUT_MS=5000
RATE_LIMIT_PER_SECOND=12
```

`config.js` перевіряє числові значення, діапазони та забороняє `..` у каталогах.

## HTTP

- `GET /health` — стан сервера.
- `GET /api/rooms` — список кімнат.
- `POST /api/rooms` — створення кімнати.
- `GET /api/replay/:roomId` — потокове читання NDJSON-логу.
- `GET /*` — статичний клієнт із `client/dist`.

Шляхи з `..` відхиляються. У development Vite проксує `/api` та `/ws` на Node.

## WebSocket-протокол

Клієнт використовує `ReconnectingSocket`: повідомлення стають у чергу, якщо сокет ще не відкритий або його `bufferedAmount` занадто великий. Після розриву виконується повторне підключення з backoff: 0.5 → 1 → 2 → 4 … до 10 с.

Вхід:

```json
{"type":"join","name":"Pilot","roomId":"alpha"}
```

Чат:

```json
{"type":"chat","text":"Hello!"}
```

Вихід:

```json
{"type":"leave"}
```

### Захист повідомлень

Сервер перевіряє:

1. JSON-синтаксис;
2. відомий `type`;
3. форму повідомлення;
4. максимальний розмір;
5. ліміт повідомлень за секунду.

Помилки протоколу закривають сокет із кодами WebSocket `1003`, `1007` або `1008` залежно від причини.

`join` повинен відбутися протягом 5 секунд.

Ping виконується раз на 15 секунд. Якщо клієнт не відповідає `pong`, наступний heartbeat завершує сокет. Таким чином два послідовні пропуски призводять до розриву.

## Room та EventEmitter

`Room extends EventEmitter` і генерує `join` / `leave`. `RoomManager` зберігає кімнати в `Map`. Тимчасова порожня кімната видаляється.

Обробник `error` для WebSocket встановлений явно. Це важливо, тому що необроблена подія `error` для Node `EventEmitter` є особливою: якщо немає слухача `error`, Node викидає виняток і процес може завершитися.

## Streams і backpressure

Журнал матчу записується так:

```text
Room events → Transform → NDJSON → createWriteStream
```

`Transform` перетворює об'єкти подій у рядки NDJSON. `pipeline()` з'єднує потоки та коректно поширює помилки.

Повтор матчу через `/api/replay/:roomId` використовує `createReadStream()` і `pipe(res)`. Файл не читається повністю в пам'ять.

Якщо `res`/інший downstream споживає дані повільно, Node Stream застосовує backpressure: producer зупиняє подальший запис, коли внутрішній буфер переповнюється. Тому великий лог не повинен спричиняти лінійне зростання RSS.

### Очікуваний графік RSS при повільному скачуванні великого логу

```text
RSS
│       ─────────────────────────────
│      /
│     /
│____/________________________________ time
        повільний канал
```

Невеликий стартовий стрибок нормальний: RSS містить runtime Node та буфери. Але під час передачі великого файлу крива повинна залишатися приблизно пласкою, а не рости пропорційно розміру логу.

## node:http і Buffer

Сервер використовує стандартний `node:http`. Тіло POST збирається з `Buffer`-чанків, після чого декодується як UTF-8 JSON. Встановлено ліміт розміру body.

## ESM vs CommonJS

Проєкт використовує ESM:

```js
import http from 'node:http';
export const config = ...;
```

Для CommonJS еквівалентом були б `require()` і `module.exports`. У Node режим ESM визначений через `"type": "module"` у package.json.

## npm workspaces

Кореневий `package.json` оголошує:

```json
"workspaces": ["client", "server"]
```

Тому `npm install`, `npm run build --workspace client` та інші команди можуть керувати двома пакетами з одного кореня.

## Фази event loop у libuv

Спрощено Node event loop проходить через фази timers → pending callbacks → poll → check → close callbacks. `setImmediate()` належить до check, таймери — до timers. Promise callbacks і `queueMicrotask()` виконуються як microtasks між відповідними етапами JavaScript-циклу.

Якщо HTTP handler синхронно працює 300 мс, він блокує JavaScript thread: інші HTTP-запити, WebSocket callbacks, timers і обробка I/O не можуть нормально прогресувати протягом цих 300 мс. Тому CPU-heavy роботу слід виносити з event loop, наприклад у Worker Threads або окремий процес.

## Чому `error` без listener небезпечний

`EventEmitter` має спеціальну семантику для події `error`. Якщо emitter генерує `error` і немає listener на `error`, Node кидає цю помилку як uncaught exception. У сервері listener встановлено для WebSocket, а `pipeline()` використовується для поширення stream-помилок.

## SIGINT / SIGTERM

При `SIGINT` або `SIGTERM` сервер:

1. закриває WebSocket-сокети;
2. завершує логувальні streams;
3. закриває HTTP server;
4. завершується з кодом `0`.

## Перевірка

### Health

```bash
curl http://localhost:3000/health
```

### Rooms

```bash
curl http://localhost:3000/api/rooms
```

### POST room

```bash
curl -X POST http://localhost:3000/api/rooms ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"New Arena\"}"
```

## Підсумок

Лабораторна демонструє Node.js як серверне середовище: `EventEmitter`, `node:http`, `Buffer`, streams/backpressure, ESM, npm workspaces і WebSocket через `ws`. Сервер відповідає лише за lobby/rooms/chat та журнал подій. Синхронізація координат кораблів навмисно не реалізована — вона переноситься до Лабораторної №5.
