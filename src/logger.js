// Lightweight local behavioural logger. It only OBSERVES the game (main.js calls it); it never changes how actions are triggered or
// how the physics runs. Data live in memory and in sessionStorage (so an accidental refresh keeps them) and are downloaded by the
// player as JSON/CSV. Nothing is ever sent anywhere. No names, e-mails, IPs or fingerprinting; the session ID is random.
//
// JSON layout:  { schema, session: {...}, trials: [ { ...trial summary..., actions: [ {...action...} ] } ] }
//   trial.outcome: 'completed' | 'reset' | 'switched_tower' (another tower/version/scene/demo toggle selected) | 'abandoned' (page closed/reloaded) | 'dev_reload'
//   action.result: 'fired' (a hit: impulse applied) | 'miss' (press on empty space/platform) | 'ignored_busy' | 'ignored_paused' |
//                  'ignored_after_clear' | 'ignored_hold_active' | 'released_early' (hold shorter than required, nothing fired)
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const SCHEMA = 'blockgame-log/1';
const KEY = 'blockgame_log_v1';

const randomId = () => { const a = new Uint8Array(6); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); };
const iso = () => new Date().toISOString();
const r3 = v => (v === null || v === undefined ? null : Math.round(v * 1000) / 1000);

/** What the browser reports (observed) and what we guess from it (inferred). */
function environment() {
  const ua = navigator.userAgent || '';
  const uad = navigator.userAgentData;
  const brand = (uad?.brands || []).filter(b => !/not.?a.?brand/i.test(b.brand)).map(b => `${b.brand} ${b.version}`)[0];
  const browser = brand ?? (/Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'unknown');
  const os = uad?.platform || (/Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'unknown');
  const touchPoints = navigator.maxTouchPoints || 0;
  const coarse = matchMedia('(pointer: coarse)').matches, hover = matchMedia('(hover: hover)').matches;
  const shortSide = Math.min(screen.width, screen.height);
  // Inference only: browsers cannot tell a phone from a tablet or a trackpad from a mouse reliably.
  const category = touchPoints > 0 && coarse ? (shortSide < 600 ? 'phone' : 'tablet') : 'desktop/laptop';
  return {
    observed: {
      browser, os, userAgentDataAvailable: !!uad,
      screenWidth: screen.width, screenHeight: screen.height, devicePixelRatio: window.devicePixelRatio,
      viewportWidth: innerWidth, viewportHeight: innerHeight,
      orientation: screen.orientation?.type ?? (innerWidth >= innerHeight ? 'landscape' : 'portrait'),
      maxTouchPoints: touchPoints, pointerCoarse: coarse, hoverCapable: hover,
    },
    inferred: { deviceCategory: category, note: 'deviceCategory is a heuristic guess from touch support and screen size; trackpad vs mouse cannot be distinguished. Actual input devices are in session.inputObserved (counts of pointerdown by pointerType).' },
  };
}

export class Logger {
  constructor() {
    this.active = null; this.t0 = 0;
    let restored = null;
    try { restored = JSON.parse(sessionStorage.getItem(KEY)); } catch { /* ignore */ }
    if (restored?.schema === SCHEMA) {
      this.data = restored;
      for (const t of this.data.trials) if (!t.endedAt) { t.outcome = 'abandoned'; t.completed = false; t.note = 'page reloaded or closed before the trial ended'; }
      this.data.session.restores = (this.data.session.restores ?? 0) + 1;
    } else {
      this.data = { schema: SCHEMA, session: { sessionId: randomId(), startedAt: iso(), appVersion: APP_VERSION, ...environment(), inputObserved: { mouse: 0, touch: 0, pen: 0, other: 0 }, restores: 0 }, trials: [] };
    }
    addEventListener('pagehide', () => { this.endTrial('abandoned'); this.persist(); });
    this.persist();
  }

  get sessionId() { return this.data.session.sessionId; }

  /** meta: { towerId, set, index, configId, inverted, variant, demoMode, physics } */
  beginTrial(meta) {
    this.t0 = performance.now();
    const t = {
      sessionId: this.sessionId, trialNumber: this.data.trials.length + 1, ...meta,
      startedAt: iso(), endedAt: null, durationMs: null, completed: false, outcome: null,
      viewport: { width: innerWidth, height: innerHeight, orientation: screen.orientation?.type ?? (innerWidth >= innerHeight ? 'landscape' : 'portrait') },
      attempts: 0, hits: 0, misses: 0, ignored: 0, releasedEarly: 0, actions: [],
    };
    this.data.trials.push(t); this.active = t; this.persist();
  }

  /** Called on every primary pointerdown on the canvas. Returns the action record (to be completed later). */
  logAttempt(a) {
    const t = this.active; if (!t) return null;
    t.attempts++;
    const pt = a.pointerType in this.data.session.inputObserved ? a.pointerType : 'other';
    this.data.session.inputObserved[pt]++;
    const rec = {
      trialNumber: t.trialNumber, actionNumber: t.attempts, tMs: r3(performance.now() - this.t0),
      pointerType: a.pointerType, screen: { x: r3(a.x), y: r3(a.y) }, world: a.world ? { x: r3(a.world.x), y: r3(a.world.y), z: r3(a.world.z) } : null,
      blockIndex: a.blockIndex ?? null, material: a.material ?? null, hitBlock: a.blockIndex !== null && a.blockIndex !== undefined,
      result: a.result, impulse: null, holdMs: null,
    };
    if (rec.result === 'miss') t.misses++; else if (rec.result?.startsWith('ignored')) t.ignored++;
    t.actions.push(rec); this.persist(); return rec;
  }

  /** The press turned into an impulse. */
  markFired(rec, impulse, holdMs) {
    if (!rec || !this.active) return;
    rec.result = 'fired'; rec.impulse = { magnitude: r3(impulse.magnitude), direction: { x: r3(impulse.dir.x), y: r3(impulse.dir.y), z: r3(impulse.dir.z) } }; rec.holdMs = r3(holdMs);
    this.active.hits++; this.persist();
  }

  markReleasedEarly(rec, holdMs) {
    if (!rec || rec.result === 'fired' || !this.active) return;
    rec.result = 'released_early'; rec.holdMs = r3(holdMs); this.active.releasedEarly++; this.persist();
  }

  /** Close the current trial (no-op if already closed, so a completed trial is never overwritten). */
  endTrial(outcome) {
    const t = this.active; if (!t) return;
    for (const a of t.actions) if (a.result === 'pending') a.result = 'interrupted';   // press still undecided when the trial ended
    t.endedAt = iso(); t.durationMs = r3(performance.now() - this.t0); t.outcome = outcome; t.completed = outcome === 'completed';
    this.active = null; this.persist();
  }

  persist() { try { sessionStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* storage full/unavailable: keep in memory */ } }

  fileStem() { return `blockgame_${this.sessionId}_${new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')}`; }

  json() { return JSON.stringify({ ...this.data, exportedAt: iso() }, null, 1); }

  csv() {
    const cols = ['sessionId', 'trialNumber', 'towerId', 'configId', 'inverted', 'variant', 'set', 'demoMode', 'startedAt', 'endedAt', 'durationMs', 'outcome', 'completed', 'attempts', 'hits', 'misses', 'ignored', 'releasedEarly'];
    const physics = ['impulseMagnitude', 'holdMs', 'grayDensityRatio', 'pinkFriction'];
    const esc = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = this.data.trials.map(t => [...cols.map(c => t[c]), ...physics.map(p => t.physics?.[p])].map(esc).join(','));
    return [[...cols, ...physics].join(','), ...rows].join('\n');
  }

  download(kind) {
    const text = kind === 'csv' ? this.csv() : this.json();
    const blob = new Blob([text], { type: kind === 'csv' ? 'text/csv' : 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${this.fileStem()}.${kind === 'csv' ? 'csv' : 'json'}`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
}
