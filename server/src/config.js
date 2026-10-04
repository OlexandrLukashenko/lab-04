function positiveInt(name, fallback, max=65535){
  const value = process.env[name] ?? String(fallback);
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be an integer`);
  const n = Number(value);
  if (n < 1 || n > max) throw new Error(`${name} is out of range`);
  return n;
}
function safeDir(name, fallback){
  const value = process.env[name] ?? fallback;
  if (!value || value.includes('..')) throw new Error(`${name} contains an unsafe path`);
  return value;
}
export const config = Object.freeze({
  port: positiveInt('PORT', 3000),
  logDir: safeDir('LOG_DIR', './logs'),
  clientDir: safeDir('CLIENT_DIR', './client/dist'),
  maxMessageBytes: positiveInt('MAX_MESSAGE_BYTES', 4096, 1024*1024),
  joinTimeoutMs: positiveInt('JOIN_TIMEOUT_MS', 5000, 60000),
  rateLimitPerSecond: positiveInt('RATE_LIMIT_PER_SECOND', 12, 1000)
});
