// Retro PC Speaker sound effects using Web Audio API

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Play a retro PC speaker square-wave beep
  public beep(frequency: number = 880, durationMs: number = 25, type: OscillatorType = 'square') {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      // Low volume to prevent harsh clipping
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio autoplay restrictions or errors
    }
  }

  // Pixel draw blip
  public drawPixel(isSet: boolean) {
    this.beep(isSet ? 1200 : 600, 15);
  }

  // Char select click
  public selectChar() {
    this.beep(750, 18);
  }

  // Action / tool change
  public action() {
    this.beep(980, 20);
  }

  // Clear / Invert action
  public clearSound() {
    this.beep(350, 40);
  }

  // Success arpeggio (e.g. Export / Save)
  public success() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => this.beep(freq, 40, 'square'), idx * 50);
    });
  }
}

export const retroSound = new RetroAudioEngine();
