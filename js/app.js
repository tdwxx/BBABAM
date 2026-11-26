const SCREEN = {
  STATE: 'screenState',
  REVIEW: 'screenReview',
  BATTERY: 'screenBattery',
  PRACTICE: 'screenPractice',
  TIMER: 'screenTimer',
  FINISH: 'screenFinish',
};

const DURATIONS = [1, 3, 5, 30, 60];

function formatMinutes(min) {
  return min === 60 ? '1시간' : `${min}분`;
}

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
  lastLogAt: null,
  endAt: 0,
  activePractice: null,
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
  storageSet(STATE_STORAGE_KEY, JSON.stringify({ id: s.id, at: Date.now() }));
  session.practiceId = s.suggested[0];
  session.duration = s.defaultMinutes;
  renderPracticeScreen(s);
  markSelectedDuration();
  updateStartButton();
  applyTheme(s.theme);
  renderBatteryScreen(s);
  showScreen(SCREEN.BATTERY);
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

function createPracticeCard(p, suggested) {
  const card = document.createElement('button');
  card.className = 'practice-card' + (suggested ? ' suggested' : '');
  card.dataset.id = p.id;
  card.innerHTML = `<span class="emoji">${p.emoji}</span><span class="titles"><strong>${p.title}</strong><span>${p.description}</span></span>`;
  card.addEventListener('click', () => {
    session.practiceId = p.id;
    markSelectedPractice();
    updateStartButton();
  });
  return card;
}

function addPracticeGroupTitle(list, text) {
  const title = document.createElement('p');
  title.className = 'practice-group-title';
  title.textContent = text;
  list.appendChild(title);
}

function renderPracticeScreen(state) {
  const list = document.getElementById('practiceList');
  list.innerHTML = '';
  const suggestedIds = state ? state.suggested : [];
  const suggested = suggestedIds.map(getPracticeById).filter(Boolean);
  const others = REST_PRACTICES.filter((p) => !suggestedIds.includes(p.id));

  if (suggested.length) {
    addPracticeGroupTitle(list, '지금은 이런 게 잘 맞을 수 있어요');
    suggested.forEach((p) => list.appendChild(createPracticeCard(p, true)));
    addPracticeGroupTitle(list, '다른 쉼도 있어요');
  }
  others.forEach((p) => list.appendChild(createPracticeCard(p, false)));
  markSelectedPractice();
}

function markSelectedPractice() {
  document.querySelectorAll('.practice-card').forEach((c) => {
    c.classList.toggle('selected', c.dataset.id === session.practiceId);
  });
}

function markSelectedDuration() {
  document.querySelectorAll('.duration-chip').forEach((c) => {
    c.classList.toggle('selected', parseInt(c.dataset.min, 10) === session.duration);
  });
}

function renderDurationChips() {
  const row = document.getElementById('durationRow');
  row.innerHTML = '';
  DURATIONS.forEach((min) => {
    const chip = document.createElement('button');
    chip.className = 'duration-chip';
    chip.dataset.min = String(min);
    chip.textContent = formatMinutes(min);
    row.appendChild(chip);
    chip.addEventListener('click', () => {
      session.duration = parseInt(chip.dataset.min, 10);
      markSelectedDuration();
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
  session.endAt = Date.now() + session.secondsLeft * 1000;
  session.activePractice = practice;
  session.cueIndex = 0;
  requestWakeLock();

  showScreen(SCREEN.TIMER);
  document.getElementById('timerCue').textContent = practice.cues[0];
  tickTimer(practice);
  playStartChime();
  renderAmbientRow();

  const ring = document.getElementById('timerRing');
  if (practice.id === 'breathing') {
    ring.classList.add('breathing');
    startBreathCycle();
  } else {
    ring.classList.remove('breathing');
  }

  clearInterval(session.timer);
  session.timer = setInterval(advanceTimer, 1000);
  if (!isSoundEnabled()) {
    showAmbientHint('소리가 꺼져 있어요. 오른쪽 위 🔇를 누르면 켜져요.');
  }
}

// 화면이 꺼지거나 탭이 가려져도 시간이 어긋나지 않게, 끝나는 시각 기준으로 남은 시간을 계산해요
function advanceTimer() {
  const practice = session.activePractice;
  if (!practice) return;
  session.secondsLeft = Math.max(0, Math.ceil((session.endAt - Date.now()) / 1000));
  tickTimer(practice);
  if (session.secondsLeft <= 0) {
    clearInterval(session.timer);
    finishPractice(practice);
  }
}

let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      const lock = await navigator.wakeLock.request('screen');
      if (!session.activePractice) {
        // 요청이 끝나기 전에 쉼이 끝났거나 멈췄다면 바로 놓아줘요
        lock.release().catch(() => {});
        return;
      }
      wakeLock = lock;
      lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
    }
  } catch (e) {
    /* wake lock not available, skip */
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
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

const LONG_SESSION_SECONDS = 10 * 60;
const LONG_CUE_SECONDS = 120;

function tickTimer(practice) {
  const total = session.duration * 60;
  const elapsed = total - session.secondsLeft;
  const pct = Math.min(100, Math.round((elapsed / total) * 100));
  document.getElementById('timerRing').style.setProperty('--progress', `${pct}%`);

  const mins = Math.floor(session.secondsLeft / 60);
  const secs = session.secondsLeft % 60;
  document.getElementById('timerCount').textContent = `${mins}:${String(secs).padStart(2, '0')}`;

  const lastCue = practice.cues.length - 1;
  let nextIndex;
  if (total > LONG_SESSION_SECONDS) {
    // 긴 시간에는 문구를 천천히 돌려 보여주고, 마무리 문구는 마지막 1분에만 보여줘요
    nextIndex = session.secondsLeft <= 60 ? lastCue : Math.floor(elapsed / LONG_CUE_SECONDS) % lastCue;
  } else {
    nextIndex = Math.min(Math.floor((elapsed / total) * practice.cues.length), lastCue);
  }
  if (nextIndex !== session.cueIndex) {
    session.cueIndex = nextIndex;
    document.getElementById('timerCue').textContent = practice.cues[nextIndex];
  }
}

function stopPractice() {
  if (session.duration > 1 && !window.confirm('그만할까요? 지금까지 쉰 시간은 기록되지 않아요.')) return;
  clearInterval(session.timer);
  session.activePractice = null;
  releaseWakeLock();
  stopBreathCycle();
  stopAmbientAudio();
  applyTheme(null);
  showScreen(SCREEN.STATE);
}

function finishPractice(practice) {
  session.activePractice = null;
  releaseWakeLock();
  stopBreathCycle();
  stopAmbientAudio();
  playEndChime();
  logCompletion(practice);
  showScreen(SCREEN.FINISH);
  document.getElementById('finishMessage').textContent = pickRandom(FINISH_MESSAGES);
  document.getElementById('finishLog').textContent = `지금까지 총 ${getLogCount()}번 충전했어요`;
  document.getElementById('noteInput').value = '';
  const emojiEl = document.querySelector('.finish-emoji');
  emojiEl.classList.remove('pulse');
  void emojiEl.offsetWidth;
  emojiEl.classList.add('pulse');
}

function logCompletion(practice) {
  const log = readLog();
  const entry = {
    stateId: session.state ? session.state.id : null,
    battery: session.state ? session.state.battery : null,
    practiceId: practice.id,
    minutes: session.duration,
    note: '',
    at: Date.now(),
  };
  log.push(entry);
  writeLog(log);
  session.lastLogAt = entry.at;
}

function saveNoteIfAny() {
  if (session.lastLogAt === null) return;
  const note = document.getElementById('noteInput').value.trim();
  if (!note) return;
  const log = readLog();
  const entry = log.find((e) => e.at === session.lastLogAt);
  if (entry) {
    entry.note = note;
    writeLog(log);
  }
}

function resetToStart() {
  session.practiceId = null;
  session.duration = 3;
  markSelectedPractice();
  markSelectedDuration();
  updateStartButton();
  applyTheme(null);
  showScreen(SCREEN.STATE);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatLogDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function renderReviewScreen() {
  const list = document.getElementById('reviewList');
  const log = readLog().slice().reverse();
  document.getElementById('reviewClearBtn').hidden = log.length === 0;

  if (log.length === 0) {
    list.innerHTML = '<p class="review-empty">아직 기록이 없어요. 쉬고 나면 여기 조금씩 쌓일 거예요.</p>';
    return;
  }

  list.innerHTML = '';
  log.forEach((entry) => {
    const s = getStateById(entry.stateId);
    const p = getPracticeById(entry.practiceId);
    const row = document.createElement('div');
    row.className = 'review-item';
    const parts = [
      `<span class="review-date">${formatLogDate(entry.at)}</span>`,
      s ? `<span>${s.emoji} ${s.label}</span>` : '',
      p ? `<span>${p.emoji} ${p.title} · ${formatMinutes(entry.minutes)}</span>` : '',
    ].filter(Boolean);
    row.innerHTML = `<div class="review-meta">${parts.join(' · ')}</div>${
      entry.note ? `<div class="review-note">"${escapeHtml(entry.note)}"</div>` : ''
    }`;
    list.appendChild(row);
  });
}

function renderAmbientRow() {
  const row = document.getElementById('ambientRow');
  row.innerHTML = '';
  const current = getAmbientSelection();

  const noneChip = document.createElement('button');
  noneChip.className = `ambient-chip${current ? '' : ' selected'}`;
  noneChip.textContent = '🚫 없음';
  noneChip.addEventListener('click', () => {
    clearAmbientSelection();
    renderAmbientRow();
  });
  row.appendChild(noneChip);

  AMBIENT_SOUNDS.forEach((a) => {
    const chip = document.createElement('button');
    chip.className = `ambient-chip${current === a.id ? ' selected' : ''}`;
    chip.textContent = `${a.emoji} ${a.label}`;
    chip.addEventListener('click', () => {
      if (!a.external && !isSoundEnabled()) {
        setSoundEnabled(true);
        syncSoundToggle();
      }
      startAmbient(a.id);
      renderAmbientRow();
    });
    row.appendChild(chip);
  });
}

function syncSoundToggle() {
  const btn = document.getElementById('soundToggleBtn');
  const on = isSoundEnabled();
  btn.textContent = on ? '🔊' : '🔇';
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기');
}

function renderSoundToggle() {
  const btn = document.getElementById('soundToggleBtn');
  syncSoundToggle();
  btn.addEventListener('click', () => {
    setSoundEnabled(!isSoundEnabled());
    syncSoundToggle();
    if (isSoundEnabled()) {
      getAudioContext();
      playTone(660, 0.2);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderStateCards();
  renderPracticeScreen(null);
  renderDurationChips();
  markSelectedDuration();
  renderSoundToggle();

  document.getElementById('goToPracticeBtn').addEventListener('click', () => {
    showScreen(SCREEN.PRACTICE);
  });
  document.getElementById('batteryBackBtn').addEventListener('click', () => {
    applyTheme(null);
    showScreen(SCREEN.STATE);
  });
  document.getElementById('practiceBackBtn').addEventListener('click', () => {
    showScreen(SCREEN.BATTERY);
  });
  document.getElementById('reviewClearBtn').addEventListener('click', () => {
    if (!window.confirm('지금까지의 기록을 모두 지울까요? 되돌릴 수 없어요.')) return;
    storageRemove(LOG_STORAGE_KEY);
    session.lastLogAt = null;
    renderReviewScreen();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session.activePractice) {
      advanceTimer();
      requestWakeLock();
    }
  });
  document.getElementById('startPracticeBtn').addEventListener('click', startPractice);
  document.getElementById('stopPracticeBtn').addEventListener('click', stopPractice);
  document.getElementById('restartBtn').addEventListener('click', () => {
    saveNoteIfAny();
    resetToStart();
  });
  document.getElementById('closeBtn').addEventListener('click', () => {
    saveNoteIfAny();
    document.getElementById('finishMessage').textContent = '언제든 다시 와도 좋아요. 잘 쉬었어요.';
  });

  document.getElementById('reviewToggleBtn').addEventListener('click', () => {
    renderReviewScreen();
    showScreen(SCREEN.REVIEW);
  });
  document.getElementById('reviewBackBtn').addEventListener('click', () => {
    showScreen(SCREEN.STATE);
  });

  showScreen(SCREEN.STATE);
  bindKeyboardShortcuts();
});
