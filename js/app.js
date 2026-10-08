const STATE_STORAGE_KEY = 'charging_state';
const LOG_STORAGE_KEY = 'charging_log';

const session = {
  state: null,
  practiceId: null,
  duration: 3,
  timer: null,
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

function selectState(id) {
  const s = getStateById(id);
  if (!s) return;
  session.state = s;
  try {
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({ id: s.id, at: Date.now() }));
  } catch (e) {
    /* storage unavailable, skip silently */
  }
  renderBatteryScreen(s);
  showScreen('screenBattery');
}

function renderBatteryScreen(s) {
  document.getElementById('batteryMessage').textContent = s.message;
  document.getElementById('batteryPercent').textContent = `${s.battery}%`;
  const fill = document.getElementById('batteryFill');
  fill.style.width = `${s.battery}%`;
  fill.style.background = batteryColor(s.battery);
  fill.style.height = '100%';
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
  showScreen('screenState');
}

function finishPractice(practice) {
  logCompletion(practice);
  showScreen('screenFinish');
  document.getElementById('finishLog').textContent = `지금까지 총 ${getLogCount()}번 충전했어요`;
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
  showScreen('screenState');
}

document.addEventListener('DOMContentLoaded', () => {
  renderStateCards();
  renderPracticeScreen();
  document.querySelector('.duration-chip[data-min="3"]').classList.add('selected');

  document.getElementById('goToPracticeBtn').addEventListener('click', () => {
    showScreen('screenPractice');
  });
  document.getElementById('startPracticeBtn').addEventListener('click', startPractice);
  document.getElementById('stopPracticeBtn').addEventListener('click', stopPractice);
  document.getElementById('restartBtn').addEventListener('click', resetToStart);
  document.getElementById('closeBtn').addEventListener('click', () => {
    document.getElementById('finishWrap').textContent = '언제든 다시 와도 좋아요. 잘 쉬었어요.';
  });

  showScreen('screenState');
});
