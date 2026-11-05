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
      data[i] = Math.max(-1, Math.min(1, last * 1.2));
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
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1500;
  filter.Q.value = 0.3;
  const gain = ctx.createGain();
  gain.gain.value = 0.015;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  return {
    stop() {
      try { src.stop(); } catch (e) { /* already stopped */ }
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
    },
  };
}

function startWind(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 4, 'brown');
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 450;
  filter.Q.value = 0.4;
  const gain = ctx.createGain();
  gain.gain.value = 0.07;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 120;
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

const AMBIENT_SOUNDS = [
  { id: 'wind', emoji: '✈️', label: '기내소리', start: startWind },
  { id: 'white', emoji: '📻', label: '백색소음', start: startWhiteNoise },
];

// 유튜브 무료 음원 목록. 임베드가 허용된 영상만 넣고, 직접 한 번 재생해서 확인해요.
// 예: { id: 'yt_rain', emoji: '🌧️', label: '빗소리', videoId: '영상ID' }
const YOUTUBE_SOUNDS = [
  { id: 'yt_fire', emoji: '🔥', label: '모닥불', videoId: 'N_g3AiXF-q8' },
  { id: 'yt_rain', emoji: '🌧️', label: '빗소리', videoId: 'gZqkSSqBa-8' },
];

let ytApiPromise = null;

function loadYouTubeApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      ytApiPromise = null;
      reject(new Error('youtube api failed to load'));
    };
    document.head.appendChild(script);
  });
  return ytApiPromise;
}

function startYouTube(videoId) {
  const slot = document.getElementById('ytPlayerSlot');
  const mount = document.createElement('div');
  slot.appendChild(mount);
  slot.hidden = false;
  let player = null;
  let stopped = false;

  const giveUp = () => {
    if (stopped) return;
    clearAmbientSelection();
    renderAmbientRow();
  };

  loadYouTubeApi()
    .then((YT) => {
      if (stopped) return;
      player = new YT.Player(mount, {
        width: 200,
        height: 200,
        videoId,
        playerVars: { playsinline: 1, loop: 1, playlist: videoId, rel: 0 },
        events: {
          onReady: (e) => {
            e.target.setVolume(40);
            e.target.playVideo();
          },
          onError: giveUp,
        },
      });
    })
    .catch(giveUp);

  return {
    stop() {
      stopped = true;
      if (player && player.destroy) {
        try { player.destroy(); } catch (e) { /* already removed */ }
      }
      slot.innerHTML = '';
      slot.hidden = true;
    },
  };
}

YOUTUBE_SOUNDS.forEach((y) => {
  AMBIENT_SOUNDS.push({ id: y.id, emoji: y.emoji, label: y.label, external: true, start: () => startYouTube(y.videoId) });
});

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
  const ctx = def.external ? null : getAudioContext();
  if (!def.external && !ctx) return;
  currentAmbient = { id, handle: def.start(ctx) };
  setAmbientSelection(id);
}
