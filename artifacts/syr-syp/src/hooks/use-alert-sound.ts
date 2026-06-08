const SOUND_PREF_KEY = 'syp-alert-sound-enabled';

export function getAlertSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setAlertSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_PREF_KEY, String(enabled));
  } catch { /* ignore */ }
}

export function playAlertChime(): void {
  if (!getAlertSoundEnabled()) return;
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = [
      { freq: 1046.5, start: 0,    dur: 0.25 },
      { freq: 1318.5, start: 0.1,  dur: 0.25 },
      { freq: 1568.0, start: 0.2,  dur: 0.45 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);

      const attackEnd = ctx.currentTime + note.start + 0.01;
      const releaseStart = ctx.currentTime + note.start + note.dur * 0.6;
      const releaseEnd = ctx.currentTime + note.start + note.dur;

      gain.gain.setValueAtTime(0, ctx.currentTime + note.start);
      gain.gain.linearRampToValueAtTime(0.18, attackEnd);
      gain.gain.setValueAtTime(0.18, releaseStart);
      gain.gain.linearRampToValueAtTime(0, releaseEnd);

      osc.start(ctx.currentTime + note.start);
      osc.stop(releaseEnd);
    }

    setTimeout(() => ctx.close(), 1500);
  } catch { /* browser blocked autoplay — silent */ }
}
