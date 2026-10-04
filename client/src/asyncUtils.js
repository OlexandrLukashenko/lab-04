export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
}

export async function fetchJson(url, { signal, ...options } = {}) {
  const response = await fetch(url, { ...options, signal });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${url}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function isRetryable(error) {
  return !(error?.status >= 400 && error?.status < 500) && error?.name !== 'AbortError';
}

export async function retry(task, { retries = 3, baseMs = 250, signal } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await task(signal); }
    catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw error;
      const jitter = Math.random() * 120;
      await sleep(baseMs * 2 ** attempt + jitter, signal);
    }
  }
}

export function loadImage(url, options = {}) {
  return retry((signal) => new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const onAbort = () => { image.src = ''; cleanup(); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); };
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => { cleanup(); reject(new Error(`Image failed: ${url}`)); };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) return onAbort();
    image.src = url;
  }), options);
}

export function loadJson(url, options = {}) {
  return retry((signal) => fetchJson(url, { signal }), options);
}

export function loadAudio(url, audioContext, options = {}) {
  return retry(async (signal) => {
    const response = await fetch(url, { signal });
    if (!response.ok) { const e = new Error(`HTTP ${response.status}: ${url}`); e.status = response.status; throw e; }
    const data = await response.arrayBuffer();
    return audioContext.decodeAudioData(data);
  }, options);
}

export async function loadAll(manifest, { signal, onProgress, audioContext } = {}) {
  const entries = Object.entries(manifest);
  let done = 0;
  const loaded = {};
  const tasks = entries.map(async ([key, spec]) => {
    const value = spec.type === 'image'
      ? await loadImage(spec.url, { signal })
      : spec.type === 'audio'
        ? await loadAudio(spec.url, audioContext, { signal })
        : await loadJson(spec.url, { signal });
    loaded[key] = value;
    done++;
    onProgress?.({ key, done, total: entries.length, value });
    return value;
  });
  await Promise.all(tasks);
  return loaded;
}
