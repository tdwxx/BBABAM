const SOUND_STORAGE_KEY = 'sound_enabled';

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function isSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch (e) {
    /* storage unavailable, skip silently */
  }
}

function playTone(freq, duration, delay = 0) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;

  const start = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.12, start + 0.05);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playStartChime() {
  playTone(660, 0.35);
  playTone(880, 0.4, 0.15);
}

function playEndChime() {
  playTone(880, 0.3);
  playTone(660, 0.45, 0.15);
  playTone(990, 0.5, 0.3);
}

function playBreathTone(phase) {
  // phase: 'in' | 'out'
  playTone(phase === 'in' ? 440 : 330, 0.6);
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      /* unsupported or blocked, skip silently */
    }
  }
}
