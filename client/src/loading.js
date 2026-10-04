export function showLoading(root) {
  const screen = document.createElement('div');
  screen.className = 'loading';
  screen.innerHTML = `<div class="loading-card"><h2>Завантаження ассетів</h2><div class="progress"><i></i></div><div class="progress-text">0%</div><div class="asset-list"></div><button id="retryLoad">Retry</button></div>`;
  root.append(screen);
  return {
    screen,
    setProgress({ key, done, total }) {
      screen.querySelector('i').style.width = `${done / total * 100}%`;
      screen.querySelector('.progress-text').textContent = `${done}/${total} — ${key}`;
      const item = document.createElement('div'); item.textContent = `✓ ${key}`; screen.querySelector('.asset-list').append(item);
    },
    setError(error) { screen.querySelector('.progress-text').textContent = `Помилка: ${error.message}`; screen.querySelector('#retryLoad').hidden = false; },
    onRetry(handler) { screen.querySelector('#retryLoad').onclick = handler; },
    remove() { screen.remove(); },
  };
}
