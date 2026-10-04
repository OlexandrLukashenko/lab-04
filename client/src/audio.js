export class AudioBus extends EventTarget {
  constructor() {
    super();
    this.context = new AudioContext();
    this.buffers = new Map();
    this.enabled = true;
    this.addEventListener('fired', () => this.play('shot'));
    this.addEventListener('hit', () => this.play('hit'));
    this.addEventListener('exploded', () => this.play('explosion'));
  }
  async resumeFromGesture() {
    if (this.context.state !== 'running') await this.context.resume();
  }
  setBuffers(buffers) { this.buffers = new Map(Object.entries(buffers)); }
  play(name) {
    if (!this.enabled) return;
    const buffer = this.buffers.get(name);
    if (!buffer || this.context.state !== 'running') return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.12;
    source.connect(gain).connect(this.context.destination);
    source.start();
  }
  emit(name, detail = {}) { this.dispatchEvent(new CustomEvent(name, { detail })); }
}
