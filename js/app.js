const STATE_STORAGE_KEY = 'charging_state';
const LOG_STORAGE_KEY = 'charging_log';

const FINISH_MESSAGES = [
  '조금이라도 충전됐길 바라요.',
  '잠깐의 쉼도 충분히 의미 있어요.',
  '여기까지 온 것만으로도 잘했어요.',
];

const session = {
  state: null,
  practiceId: null,
  duration: 3,
  timer: null,
  breathTimer: null,
  secondsLeft: 0,
  cueIndex: 0,
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function batteryColor(pct) {
  if (pct <= 25) return getComputedStyle(document.documentElement).getPropertyValue('--battery-low');
  if (pct <= 55) return getComputedStyle(document.documentElement).getPropertyValue('--battery-mid');
  return getComputedStyle(document.documentElement).getPropertyValue('--battery-good');
}

function renderStateCards() {
  const grid = document.getElementById('stateGrid');
  grid.innerHTML = '';
  STATES.forEach((s) => {
    const btn = document.createElement('button');
    btn.className = 'state-card';
    btn.innerHTML = `<span class="emoji">${s.emoji}</span><span>${s.label}</span>`;
    btn.addEventListener('click', () => selectState(s.id));
    grid.appendChild(btn);
  });
}

function applyTheme(theme) {
  document.documentElement.style.setProperty('--bg', theme || '#fdf8f3');
}

function selectState(id) {
  const s = getStateById(id);
  if (!s) return;
  session.state = s;
  try {
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({ id: s.id, at: Date.now() }));
  } catch (e) {
    /* storage unavailable, skip silently */
  }
  applyTheme(s.theme);
  renderBatteryScreen(s);
  showScreen('screenBattery');
}

function renderBatteryScreen(s) {
  document.getElementById('batteryMessage').textContent = pickRandom(s.messages);
  document.getElementById('batteryPercent').textContent = `${s.battery}%`;
  const fill = document.getElementById('batteryFill');
  fill.style.height = '100%';
  fill.style.width = '0%';
  fill.style.background = batteryColor(s.battery);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.width = `${s.battery}%`;
    });
  });
}

function renderPracticeScreen() {
  const list = document.getElementById('practiceList');
  list.innerHTML = '';
  REST_PRACTICES.forEach((p) => {
    const card = document.createElement('button');
    card.className = 'practice-card';
    card.dataset.id = p.id;
    card.innerHTML = `<span class="emoji">${p.emoji}</span><span class="titles"><strong>${p.title}</strong><span>${p.description}</span></span>`;
    card.addEventListener('click', () => {
      session.practiceId = p.id;
      document.querySelectorAll('.practice-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      updateStartButton();
    });
    list.appendChild(card);
  });

  document.querySelectorAll('.duration-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      session.duration = parseInt(chip.dataset.min, 10);
      document.querySelectorAll('.duration-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      updateStartButton();
    });
  });
}

function updateStartButton() {
  const btn = document.getElementById('startPracticeBtn');
  btn.disabled = !session.practiceId;
}

function startPractice() {
  const practice = getPracticeById(session.practiceId);
  if (!practice) return;

  session.secondsLeft = session.duration * 60;
  session.cueIndex = 0;

  showScreen('screenTimer');
  document.getElementById('timerCue').textContent = practice.cues[0];
  tickTimer(practice);
  playStartChime();

  const ring = document.getElementById('timerRing');
  if (practice.id === 'breathing') {
    ring.classList.add('breathing');
    startBreathCycle();
  } else {
    ring.classList.remove('breathing');
  }

  clearInterval(session.timer);
  session.timer = setInterval(() => {
    session.secondsLeft -= 1;
    tickTimer(practice);
    if (session.secondsLeft <= 0) {
      clearInterval(session.timer);
      finishPractice(practice);
    }
  }, 1000);
}

function startBreathCycle() {
  let phase = 'in';
  playBreathTone(phase);
  vibrate(120);
  clearInterval(session.breathTimer);
  session.breathTimer = setInterval(() => {
    phase = phase === 'in' ? 'out' : 'in';
    playBreathTone(phase);
    vibrate(phase === 'in' ? 120 : [60, 40, 60]);
  }, 4000);
}

function stopBreathCycle() {
  clearInterval(session.breathTimer);
  document.getElementById('timerRing').classList.remove('breathing');
}

function tickTimer(practice) {
  const total = session.duration * 60;
  const elapsed = total - session.secondsLeft;
  const pct = Math.min(100, Math.round((elapsed / total) * 100));
  document.getElementById('timerRing').style.setProperty('--progress', `${pct}%`);

  const mins = Math.floor(session.secondsLeft / 60);
  const secs = session.secondsLeft % 60;
  document.getElementById('timerCount').textContent = `${mins}:${String(secs).padStart(2, '0')}`;

  const cueSlot = Math.floor((elapsed / total) * practice.cues.length);
  const nextIndex = Math.min(cueSlot, practice.cues.length - 1);
  if (nextIndex !== session.cueIndex) {
    session.cueIndex = nextIndex;
    document.getElementById('timerCue').textContent = practice.cues[nextIndex];
  }
}

function stopPractice() {
  clearInterval(session.timer);
  stopBreathCycle();
  applyTheme(null);
  showScreen('screenState');
}

function finishPractice(practice) {
  stopBreathCycle();
  playEndChime();
  logCompletion(practice);
  showScreen('screenFinish');
  document.getElementById('finishMessage').textContent = pickRandom(FINISH_MESSAGES);
  document.getElementById('finishLog').textContent = `지금까지 총 ${getLogCount()}번 충전했어요`;
  const emojiEl = document.querySelector('.finish-emoji');
  emojiEl.classList.remove('pulse');
  void emojiEl.offsetWidth;
  emojiEl.classList.add('pulse');
}

function logCompletion(practice) {
  let log = [];
  try {
    log = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY)) || [];
  } catch (e) {
    log = [];
  }
  log.push({ practiceId: practice.id, minutes: session.duration, at: Date.now() });
  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(log));
  } catch (e) {
    /* storage unavailable, skip silently */
  }
}

function getLogCount() {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY)) || [];
    return log.length;
  } catch (e) {
    return 0;
  }
}

function resetToStart() {
  session.practiceId = null;
  session.duration = 3;
  document.querySelectorAll('.practice-card').forEach((c) => c.classList.remove('selected'));
  document.querySelectorAll('.duration-chip').forEach((c) => c.classList.remove('selected'));
  document.querySelector('.duration-chip[data-min="3"]').classList.add('selected');
  updateStartButton();
  applyTheme(null);
  showScreen('screenState');
}

function renderSoundToggle() {
  const btn = document.getElementById('soundToggleBtn');
  const sync = () => {
    const on = isSoundEnabled();
    btn.textContent = on ? '🔊' : '🔈';
    btn.setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기');
  };
  sync();
  btn.addEventListener('click', () => {
    setSoundEnabled(!isSoundEnabled());
    sync();
    if (isSoundEnabled()) {
      getAudioContext();
      playTone(660, 0.2);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderStateCards();
  renderPracticeScreen();
  renderSoundToggle();
  document.querySelector('.duration-chip[data-min="3"]').classList.add('selected');

  document.getElementById('goToPracticeBtn').addEventListener('click', () => {
    showScreen('screenPractice');
  });
  document.getElementById('startPracticeBtn').addEventListener('click', startPractice);
  document.getElementById('stopPracticeBtn').addEventListener('click', stopPractice);
  document.getElementById('restartBtn').addEventListener('click', resetToStart);
  document.getElementById('closeBtn').addEventListener('click', () => {
    document.getElementById('finishMessage').textContent = '언제든 다시 와도 좋아요. 잘 쉬었어요.';
  });

  showScreen('screenState');
});
