export function createInput() {
  const keys = new Set();

  function onKeyDown(event) {
    keys.add(event.key.toLowerCase());
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return {
    isPressed(key) {
      return keys.has(key.toLowerCase());
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
