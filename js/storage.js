// localStorage 읽기/쓰기를 한 곳에서 다뤄요. 저장소를 못 쓰는 환경(시크릿 모드 등)에서도 앱이 멈추지 않게 try/catch로 감싸요.

const STATE_STORAGE_KEY = 'charging_state';
const LOG_STORAGE_KEY = 'charging_log';
const SOUND_STORAGE_KEY = 'sound_enabled';
const AMBIENT_STORAGE_KEY = 'ambient_sound';

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    /* 저장소를 쓸 수 없으면 저장만 건너뛰어요 */
  }
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    /* 저장소를 쓸 수 없으면 건너뛰어요 */
  }
}

function readLog() {
  try {
    return JSON.parse(storageGet(LOG_STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function writeLog(log) {
  storageSet(LOG_STORAGE_KEY, JSON.stringify(log));
}

function getLogCount() {
  return readLog().length;
}
