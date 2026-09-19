import { clampInteger, formatTime, shuffledSet, shouldFinishSet } from "./core.mjs";

const PREP_MS = 5000;
const SWITCH_MS = 1000;
const STORAGE_KEY = "pose-cognitive-trainer-settings-v1";

const copy = {
  en: { install:"Install", readyLabel:"READY", setupTitle:"Set up your session", setupSubtitle:"Choose your pace, then get ready to move.", poseCount:"Pose number", totalTime:"Total time", poseInterval:"Time between poses", seconds:"seconds", switchPoses:"Switch poses", switchHelp:"Announce after every complete set", start:"Start session", preparing:"Preparing", preparingAudio:"Preparing voice…", audioError:"Voice preparation failed. Please restart the app and try again.", getReady:"Get ready", active:"Active", switching:"Switching", paused:"Paused", timeRemaining:"Time remaining", currentSet:"Current set", pause:"Pause", resume:"Resume", stop:"Stop", finished:"Finished", finishedHelp:"Session complete. Well done.", newSession:"New session", invalid:"Please enter values within the indicated ranges.", switchCommand:"Switch poses" },
  he: { install:"התקנה", readyLabel:"מוכן", setupTitle:"הגדרת האימון", setupSubtitle:"בחרו את הקצב והתכוננו לתנועה.", poseCount:"מספר תנוחות", totalTime:"זמן כולל", poseInterval:"זמן בין תנוחות", seconds:"שניות", switchPoses:"החלפת תנוחה", switchHelp:"הכרזה לאחר השלמת כל סדרה", start:"התחלת אימון", preparing:"מתכוננים", preparingAudio:"מכין קול…", audioError:"הכנת הקול נכשלה. יש להפעיל מחדש את היישום ולנסות שוב.", getReady:"התכוננו", active:"פעיל", switching:"מחליפים תנוחה", paused:"מושהה", timeRemaining:"זמן שנותר", currentSet:"סדרה נוכחית", pause:"השהיה", resume:"המשך", stop:"עצירה", finished:"הסתיים", finishedHelp:"האימון הושלם. כל הכבוד.", newSession:"אימון חדש", invalid:"יש להזין ערכים בטווחים המוצגים.", switchCommand:"החליפו תנוחה" }
};

const numberWords = {
  en: ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
  he: ["", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר"]
};

const elements = Object.fromEntries(["setupView","sessionView","finishedView","settingsForm","startButton","poseCount","totalTime","poseInterval","switchEnabled","formError","statusBadge","instruction","mainDisplay","timeRemaining","setProgress","progressBar","pauseButton","stopButton","newSessionButton","installButton"].map(id => [id, document.getElementById(id)]));

let language = "en";
let settings;
let phase = "idle";
let set = [];
let setIndex = 0;
let activeElapsedMs = 0;
let activeStartedAt = 0;
let timer = 0;
let deadline = 0;
let remainingDelayMs = 0;
let pendingCallback = null;
let wakeLock = null;
let deferredInstallPrompt = null;
let audioContext = null;
let currentAudioSource = null;
let audioKeepAliveOscillator = null;
const audioBuffers = new Map();
const rawAudio = new Map();
const audioFetches = new Map();

function recordingUrls(targetLanguage) {
  return [
    ...Array.from({ length: 10 }, (_, index) => `audio/${targetLanguage}/number-${index + 1}.mp3`),
    `audio/${targetLanguage}/switchCommand.mp3`,
    `audio/${targetLanguage}/finished.mp3`
  ];
}

function fetchRecording(url) {
  if (!audioFetches.has(url)) {
    audioFetches.set(url, fetch(url).then(response => {
      if (!response.ok) throw new Error(`Recording not found: ${url}`);
      return response.arrayBuffer();
    }).then(data => { rawAudio.set(url, data); return data; }));
  }
  return audioFetches.get(url);
}

function prefetchAllRecordings() {
  return Promise.all(["en", "he"].flatMap(recordingUrls).map(fetchRecording));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    language = saved.language === "he" ? "he" : "en";
    elements.poseCount.value = clampInteger(saved.poseCount, 1, 10, 4);
    elements.totalTime.value = clampInteger(saved.totalTime, 1, 240, 120);
    elements.poseInterval.value = clampInteger(saved.poseInterval, 1, 20, 5);
    elements.switchEnabled.checked = saved.switchEnabled ?? true;
  } catch { /* Defaults remain in place. */ }
  applyLanguage();
}

function readSettings() {
  return {
    poseCount: clampInteger(elements.poseCount.value, 1, 10, 4),
    totalTime: clampInteger(elements.totalTime.value, 1, 240, 120),
    poseInterval: clampInteger(elements.poseInterval.value, 1, 20, 5),
    switchEnabled: elements.switchEnabled.checked,
    language
  };
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readSettings()));
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "he" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = copy[language][node.dataset.i18n]; });
  document.querySelectorAll("[data-language]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.language === language)));
}

function showView(view) {
  elements.setupView.hidden = view !== "setup";
  elements.sessionView.hidden = view !== "session";
  elements.finishedView.hidden = view !== "finished";
}

function setStatus(state) {
  elements.statusBadge.dataset.state = state;
  elements.statusBadge.textContent = copy[language][state];
}

function updatePauseButton(isPaused) {
  const icon = elements.pauseButton.querySelector(".control-icon");
  const label = elements.pauseButton.querySelector(".action-label");
  icon.classList.toggle("pause-icon", !isPaused);
  icon.classList.toggle("play-icon", isPaused);
  label.dataset.i18n = isPaused ? "resume" : "pause";
  label.textContent = copy[language][isPaused ? "resume" : "pause"];
}

function currentActiveMs() {
  return activeElapsedMs + (phase === "active" ? performance.now() - activeStartedAt : 0);
}

function updateTimeDisplay() {
  if (!settings) return;
  const remaining = Math.max(0, settings.totalTime * 1000 - currentActiveMs());
  elements.timeRemaining.textContent = formatTime(remaining / 1000);
  const percent = Math.min(100, currentActiveMs() / (settings.totalTime * 1000) * 100);
  elements.progressBar.style.width = `${percent}%`;
  elements.progressBar.parentElement.setAttribute("aria-valuenow", String(Math.round(percent)));
}

function schedule(callback, delay) {
  clearTimeout(timer);
  pendingCallback = callback;
  remainingDelayMs = delay;
  deadline = performance.now() + delay;
  timer = window.setTimeout(callback, delay);
}

function startPrep() {
  phase = "preparing";
  setStatus("preparing");
  elements.instruction.textContent = copy[language].getReady;
  let count = 5;
  elements.mainDisplay.classList.remove("word");
  elements.mainDisplay.textContent = count;
  const tick = () => {
    count -= 1;
    if (count <= 0) { beginSet(); return; }
    elements.mainDisplay.textContent = count;
    schedule(tick, 1000);
  };
  schedule(tick, 1000);
}

function beginSet() {
  set = shuffledSet(settings.poseCount);
  setIndex = 0;
  presentPose();
}

function unlockAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume();
}

async function prepareVoice(targetLanguage) {
  if (!audioContext) throw new Error("Audio context is unavailable");
  await ensureAudioRunning();
  await Promise.all(recordingUrls(targetLanguage).map(async url => {
    if (audioBuffers.has(url)) return;
    const data = rawAudio.get(url) || await fetchRecording(url);
    audioBuffers.set(url, await audioContext.decodeAudioData(data.slice(0)));
  }));
}

async function ensureAudioRunning() {
  if (!audioContext) throw new Error("Audio context is unavailable");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (audioContext.state === "running") return;
    try {
      await Promise.race([
        audioContext.resume(),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error("Audio resume timed out")), 1000))
      ]);
    } catch { /* Retry briefly before failing the session. */ }
    if (audioContext.state === "running") return;
    await new Promise(resolve => window.setTimeout(resolve, 100));
  }
  throw new Error(`Audio engine did not resume (${audioContext.state})`);
}

function startAudioKeepAlive() {
  if (!audioContext || audioKeepAliveOscillator) return;
  const gain = audioContext.createGain();
  gain.gain.value = 0.000001;
  const oscillator = audioContext.createOscillator();
  oscillator.frequency.value = 20;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  audioKeepAliveOscillator = oscillator;
}

function stopAudioKeepAlive() {
  try { audioKeepAliveOscillator?.stop(); } catch {}
  audioKeepAliveOscillator = null;
}

async function playRecording(url, onStarted = () => {}) {
  if (!audioContext) throw new Error("Audio context is unavailable");
  await ensureAudioRunning();
  let buffer = audioBuffers.get(url);
  if (!buffer) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Recording not found: ${url}`);
    buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
    audioBuffers.set(url, buffer);
  }
  await new Promise((resolve, reject) => {
    try { currentAudioSource?.stop(); } catch {}
    const source = audioContext.createBufferSource();
    currentAudioSource = source;
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => { if (currentAudioSource === source) currentAudioSource = null; resolve(); };
    try { source.start(); onStarted(); } catch (error) { reject(error); }
  });
}

function stopSpeech() {
  try { currentAudioSource?.stop(); } catch {}
  currentAudioSource = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

async function speak(key, type = "command", onStarted = () => {}) {
  const fileName = type === "number" ? `number-${key}` : key;
  let started = false;
  const markStarted = () => { if (!started) { started = true; onStarted(); } };
  try { await playRecording(`audio/${language}/${fileName}.mp3`, markStarted); return; } catch { /* Fall back to the device voice. */ }
  if (!("speechSynthesis" in window)) { markStarted(); return; }
  await new Promise(resolve => {
    const utterance = new SpeechSynthesisUtterance(type === "number" ? numberWords[language][key] : copy[language][key]);
    utterance.lang = language === "he" ? "he-IL" : "en-US";
    utterance.rate = .9;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.cancel();
    markStarted();
    speechSynthesis.speak(utterance);
  });
}

async function presentPose() {
  phase = "preparingPose";
  try {
    await ensureAudioRunning();
  } catch (error) {
    console.error(error);
    stopSession();
    elements.formError.textContent = copy[language].audioError;
    elements.formError.hidden = false;
    return;
  }
  if (phase !== "preparingPose") return;
  phase = "active";
  activeStartedAt = performance.now();
  setStatus("active");
  elements.instruction.textContent = copy[language].poseCount;
  elements.mainDisplay.classList.remove("word");
  const pose = set[setIndex];
  elements.mainDisplay.textContent = pose;
  elements.setProgress.textContent = `${setIndex + 1} / ${settings.poseCount}`;
  speak(pose, "number", () => {
    if (phase === "active") schedule(advancePose, settings.poseInterval * 1000);
  });
}

function closeActivePeriod() {
  if (phase === "active") activeElapsedMs += performance.now() - activeStartedAt;
}

function advancePose() {
  closeActivePeriod();
  const timeExpired = shouldFinishSet(activeElapsedMs, settings.totalTime * 1000);
  if (setIndex < set.length - 1) {
    setIndex += 1;
    presentPose();
    return;
  }
  if (timeExpired) { finishSession(); return; }
  if (settings.switchEnabled) { startSwitch(); } else { beginSet(); }
}

async function startSwitch() {
  phase = "switchingSpeech";
  setStatus("switching");
  elements.instruction.textContent = copy[language].switchCommand;
  elements.mainDisplay.classList.add("word");
  elements.mainDisplay.textContent = copy[language].switchCommand;
  await speak("switchCommand");
  if (phase !== "switchingSpeech") return;
  phase = "switchingDelay";
  schedule(beginSet, SWITCH_MS);
}

function pauseSession() {
  if (phase === "paused") { resumeSession(); return; }
  if (!["preparing", "active", "switchingSpeech", "switchingDelay"].includes(phase)) return;
  const previousPhase = phase;
  if (phase === "active") closeActivePeriod();
  remainingDelayMs = Math.max(0, deadline - performance.now());
  clearTimeout(timer);
  stopSpeech();
  phase = "paused";
  elements.pauseButton.dataset.previousPhase = previousPhase;
  setStatus("paused");
  updatePauseButton(true);
}

function resumeSession() {
  const previous = elements.pauseButton.dataset.previousPhase;
  updatePauseButton(false);
  if (previous === "active") {
    phase = "active";
    activeStartedAt = performance.now();
    setStatus("active");
    schedule(pendingCallback || advancePose, remainingDelayMs);
  } else if (previous === "switchingSpeech") {
    startSwitch();
  } else {
    phase = previous;
    setStatus(previous === "preparing" ? "preparing" : "switching");
    schedule(pendingCallback || beginSet, remainingDelayMs);
  }
}

async function finishSession() {
  clearTimeout(timer);
  phase = "finished";
  updateTimeDisplay();
  showView("finished");
  await speak("finished");
  stopAudioKeepAlive();
  releaseWakeLock();
}

function stopSession() {
  clearTimeout(timer);
  stopSpeech();
  stopAudioKeepAlive();
  phase = "idle";
  releaseWakeLock();
  showView("setup");
}

async function requestWakeLock() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch { /* Unsupported or denied. */ }
}
async function releaseWakeLock() { try { await wakeLock?.release(); } catch {} wakeLock = null; }

elements.settingsForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!elements.settingsForm.checkValidity()) {
    elements.formError.textContent = copy[language].invalid;
    elements.formError.hidden = false;
    elements.settingsForm.reportValidity();
    return;
  }
  unlockAudio();
  settings = readSettings();
  saveSettings();
  activeElapsedMs = 0;
  elements.formError.hidden = true;
  elements.timeRemaining.textContent = formatTime(settings.totalTime);
  elements.setProgress.textContent = `0 / ${settings.poseCount}`;
  elements.progressBar.style.width = "0";
  updatePauseButton(false);
  showView("session");
  requestWakeLock();
  phase = "preparingAudio";
  setStatus("preparing");
  elements.instruction.textContent = copy[language].preparingAudio;
  elements.mainDisplay.classList.add("word");
  elements.mainDisplay.textContent = "…";
  elements.startButton.disabled = true;
  try {
    await prepareVoice(language);
  } catch (error) {
    console.error(error);
    elements.startButton.disabled = false;
    releaseWakeLock();
    showView("setup");
    elements.formError.textContent = copy[language].audioError;
    elements.formError.hidden = false;
    phase = "idle";
    return;
  }
  elements.startButton.disabled = false;
  if (phase !== "preparingAudio") return;
  startAudioKeepAlive();
  startPrep();
});

document.querySelectorAll("[data-language]").forEach(button => button.addEventListener("click", () => {
  language = button.dataset.language;
  applyLanguage();
  saveSettings();
}));
[elements.poseCount, elements.totalTime, elements.poseInterval, elements.switchEnabled].forEach(input => input.addEventListener("change", saveSettings));
elements.pauseButton.addEventListener("click", pauseSession);
elements.stopButton.addEventListener("click", stopSession);
elements.newSessionButton.addEventListener("click", () => { phase = "idle"; showView("setup"); });
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredInstallPrompt = event; elements.installButton.hidden = false; });
elements.installButton.addEventListener("click", async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; elements.installButton.hidden = true; });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && phase !== "idle" && phase !== "finished") requestWakeLock(); });
window.setInterval(updateTimeDisplay, 200);
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
prefetchAllRecordings().catch(() => { /* Start will retry and display an error if preparation fails. */ });
loadSettings();
showView("setup");
