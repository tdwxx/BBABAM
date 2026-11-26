// 키보드 단축키. SCREEN 상수는 app.js에 있고, 이 파일은 사용자가 키를 누를 때만 쓰여요.

function currentScreenId() {
  const active = document.querySelector('.screen.active');
  return active ? active.id : null;
}

function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const screen = currentScreenId();

    if (screen === SCREEN.STATE && /^[1-9]$/.test(e.key)) {
      const cards = document.querySelectorAll('#stateGrid .state-card');
      const card = cards[Number(e.key) - 1];
      if (card) card.click();
    } else if (screen === SCREEN.PRACTICE && e.key === 'Enter') {
      const btn = document.getElementById('startPracticeBtn');
      if (!btn.disabled && document.activeElement === document.body) btn.click();
    } else if (screen === SCREEN.BATTERY && e.key === 'Escape') {
      document.getElementById('batteryBackBtn').click();
    } else if (screen === SCREEN.PRACTICE && e.key === 'Escape') {
      document.getElementById('practiceBackBtn').click();
    } else if (screen === SCREEN.TIMER && e.key === 'Escape') {
      document.getElementById('stopPracticeBtn').click();
    } else if (screen === SCREEN.REVIEW && e.key === 'Escape') {
      document.getElementById('reviewBackBtn').click();
    } else if (screen === SCREEN.FINISH && e.key === 'Escape') {
      document.getElementById('closeBtn').click();
    }
  });
}
