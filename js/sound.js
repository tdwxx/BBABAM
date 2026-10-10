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

/* ---------- 배경 자연음 (합성) ---------- */

const AMBIENT_STORAGE_KEY = 'ambient_sound';

function makeNoiseBuffer(ctx, seconds, color) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (color === 'brown') {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return buffer;
}

function startWhiteNoise(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 2, 'white');
  src.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0.05;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  return {
    stop() {
      try { src.stop(); } catch (e) { /* already stopped */ }
      src.disconnect();
      gain.disconnect();
    },
  };
}

function startWind(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 4, 'brown');
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 500;
  filter.Q.value = 0.7;
  const gain = ctx.createGain();
  gain.gain.value = 0.18;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  lfo.start();
  return {
    stop() {
      [src, lfo].forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } });
      [src, filter, gain, lfo, lfoGain].forEach((n) => n.disconnect());
    },
  };
}

function startStream(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 3, 'white');
  src.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 600;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.value = 0.12;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 3.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.05;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  src.connect(hp);
  hp.connect(bp);
  bp.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  lfo.start();
  return {
    stop() {
      [src, lfo].forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } });
      [src, hp, bp, gain, lfo, lfoGain].forEach((n) => n.disconnect());
    },
  };
}

function startCampfire(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 4, 'brown');
  src.loop = true;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.05;
  src.connect(bedGain);
  bedGain.connect(ctx.destination);
  src.start();

  let active = true;
  const timeouts = [];

  function scheduleCrackle() {
    if (!active) return;
    const delay = 150 + Math.random() * 500;
    const id = setTimeout(() => {
      if (!active) return;
      const dur = 0.04 + Math.random() * 0.05;
      const popSrc = ctx.createBufferSource();
      popSrc.buffer = makeNoiseBuffer(ctx, dur, 'white');
      const popFilter = ctx.createBiquadFilter();
      popFilter.type = 'bandpass';
      popFilter.frequency.value = 800 + Math.random() * 2000;
      popFilter.Q.value = 2;
      const popGain = ctx.createGain();
      popGain.gain.setValueAtTime(0.25, ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      popSrc.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(ctx.destination);
      popSrc.start();
      popSrc.onended = () => {
        popSrc.disconnect();
        popFilter.disconnect();
        popGain.disconnect();
      };
      scheduleCrackle();
    }, delay);
    timeouts.push(id);
  }
  scheduleCrackle();

  return {
    stop() {
      active = false;
      timeouts.forEach(clearTimeout);
      try { src.stop(); } catch (e) { /* already stopped */ }
      src.disconnect();
      bedGain.disconnect();
    },
  };
}

function startCrickets(ctx) {
  let active = true;
  const timeouts = [];

  function scheduleChirp(baseFreq, minGap, maxGap) {
    if (!active) return;
    const delay = minGap + Math.random() * (maxGap - minGap);
    const id = setTimeout(() => {
      if (!active) return;
      const dur = 0.08;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = baseFreq + (Math.random() * 150 - 75);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      scheduleChirp(baseFreq, minGap, maxGap);
    }, delay);
    timeouts.push(id);
  }
  scheduleChirp(4200, 150, 400);
  scheduleChirp(4600, 300, 650);

  return {
    stop() {
      active = false;
      timeouts.forEach(clearTimeout);
    },
  };
}

function startForest(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 4, 'brown');
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.04;
  src.connect(filter);
  filter.connect(bedGain);
  bedGain.connect(ctx.destination);
  src.start();

  let active = true;
  const timeouts = [];

  function scheduleBird() {
    if (!active) return;
    const delay = 1000 + Math.random() * 3000;
    const id = setTimeout(() => {
      if (!active) return;
      const dur = 0.25 + Math.random() * 0.15;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const startFreq = 1800 + Math.random() * 1200;
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(startFreq * (0.7 + Math.random() * 0.6), ctx.currentTime + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      scheduleBird();
    }, delay);
    timeouts.push(id);
  }
  scheduleBird();

  return {
    stop() {
      active = false;
      timeouts.forEach(clearTimeout);
      try { src.stop(); } catch (e) { /* already stopped */ }
      src.disconnect();
      filter.disconnect();
      bedGain.disconnect();
    },
  };
}

const AMBIENT_SOUNDS = [
  { id: 'campfire', emoji: '🔥', label: '모닥불', start: startCampfire },
  { id: 'crickets', emoji: '🦗', label: '풀벌레', start: startCrickets },
  { id: 'forest', emoji: '🐦', label: '숲', start: startForest },
  { id: 'stream', emoji: '💧', label: '계곡', start: startStream },
  { id: 'wind', emoji: '🍃', label: '바람', start: startWind },
  { id: 'white', emoji: '📻', label: '백색소음', start: startWhiteNoise },
];

let currentAmbient = null;

function getAmbientSelection() {
  try {
    return localStorage.getItem(AMBIENT_STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}

function setAmbientSelection(id) {
  try {
    if (id) {
      localStorage.setItem(AMBIENT_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(AMBIENT_STORAGE_KEY);
    }
  } catch (e) {
    /* storage unavailable, skip silently */
  }
}

function stopAmbientAudio() {
  if (currentAmbient) {
    currentAmbient.handle.stop();
    currentAmbient = null;
  }
}

function clearAmbientSelection() {
  stopAmbientAudio();
  setAmbientSelection(null);
}

function startAmbient(id) {
  stopAmbientAudio();
  const def = AMBIENT_SOUNDS.find((a) => a.id === id);
  if (!def) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  currentAmbient = { id, handle: def.start(ctx) };
  setAmbientSelection(id);
}
