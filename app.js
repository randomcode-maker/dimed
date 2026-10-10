/* Dimed Stats — courtside volleyball stat tracking.
 * Plain JavaScript, no build step. All data lives on-device (localStorage). */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ helpers */
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clamp0 = (n) => (n < 0 ? 0 : n);

  const ICONS = {
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
    court: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M3 12h18"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4.5 2 4.5 4.5"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    gear: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    rotate: '<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v5h-5"/>',
    rotateBack: '<path d="M4 12a8 8 0 103-6.2"/><path d="M4 4v5h5"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M12 3c-3 3-3 15 0 18M3 12c3 3 15 3 18 0"/>',
    wand: '<path d="M5 19L17 7M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3L21 14l-1.3.7L19 16l-.7-1.3L17 14l1.3-.7z"/>',
    save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    upload: '<path d="M12 16V5M7 9l5-5 5 5M4 20h16"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  const ic = (n) => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

  /* ------------------------------------------------------------------ stat definitions */
  // score: which side gets the point when a player on OUR team records it.
  // q: whether the action is rated for quality (1-4).
  const STATS = {
    kill:      { label: 'Kill',             short: 'K',   score: 'us',   q: true, g: 'pts' },
    ace:       { label: 'Ace',              short: 'Ace', score: 'us',   q: true, g: 'pts' },
    block:     { label: 'Block kill',       short: 'BK',  score: 'us',   q: true, g: 'pts' },
    transKill: { label: 'Transition kill',  short: 'TK',  score: 'us',   q: true, g: 'pts' },
    attackErr: { label: 'Attack error',     short: 'AE',  score: 'them', g: 'err' },
    serveErr:  { label: 'Serve error',      short: 'SE',  score: 'them', g: 'err' },
    recErr:    { label: 'Reception error',  short: 'RE',  score: 'them', g: 'err' },
    netErr:    { label: 'Net / foot fault', short: 'NE',  score: 'them', g: 'err' },
    attack:    { label: 'Attack (no kill)', short: 'Att', q: true, g: 'skill' },
    serve:     { label: 'Serve in',         short: 'Srv', q: true, g: 'skill' },
    dig:       { label: 'Dig',              short: 'Dig', q: true, g: 'skill' },
    assist:    { label: 'Assist',           short: 'Ast', q: true, g: 'skill' },
    set:       { label: 'Set',              short: 'Set', q: true, g: 'skill' },
    recPass:   { label: 'Pass',             short: 'Pass', q: true, g: 'skill' },
    blockAss:  { label: 'Block assist',     short: 'BA',  q: true, g: 'skill', note: 'credit only' },
    transHit:  { label: 'Transition hit',   short: 'TH',  q: true, g: 'trans' },
    transDig:  { label: 'Transition dig',   short: 'TD',  q: true, g: 'trans' },
    transBlock:{ label: 'Transition block', short: 'TB',  q: true, g: 'trans' },
    transSet:  { label: 'Transition set',   short: 'TS',  q: true, g: 'trans' }
  };
  const STAT_KEYS = Object.keys(STATS);
  const GROUPS = [
    { id: 'pts',   title: 'Points earned', keys: ['kill', 'ace', 'block', 'transKill'] },
    { id: 'err',   title: 'Errors',        keys: ['attackErr', 'serveErr', 'recErr', 'netErr'] },
    { id: 'skill', title: 'Skills',        keys: ['attack', 'serve', 'dig', 'assist', 'set', 'recPass', 'blockAss'] },
    { id: 'trans', title: 'Transition',    keys: ['transHit', 'transDig', 'transBlock', 'transSet'] }
  ];
  const QUICK = [['kill', 'pts', 'Kill'], ['dig', 'skill', 'Dig'], ['block', 'pts', 'Block'], ['transHit', 'trans', 'T-hit'], ['transBlock', 'trans', 'T-blk'], ['transSet', 'trans', 'T-set']];
  const RATINGS = [
    { q: 4, name: 'Perfect', hint: 'Best possible result' },
    { q: 3, name: 'Good',    hint: 'Positive, kept us in system' },
    { q: 2, name: 'OK',      hint: 'Playable, limited options' },
    { q: 1, name: 'Poor',    hint: 'Weak or forced' }
  ];
  const RATING_NAME = { 4: 'Perfect', 3: 'Good', 2: 'OK', 1: 'Poor' };
  const POSITIONS = ['OH', 'MB', 'S', 'OPP', 'L', 'DS', 'RS'];
  const AVATAR_COLORS = ['#2563EB', '#DB2777', '#16A34A', '#D97706', '#0891B2', '#7C3AED', '#DC2626', '#0D9488'];
  const GROUP_DOT = { pts: '#22C55E', err: '#EF4444', skill: '#94A3B8', trans: '#3B82F6' };

  /* ---- hit landing: court geometry and zones ----
   * The court is drawn to scale (18 m x 9 m) with a 1.5 m margin for out-of-bounds taps.
   * A landing spot is stored as { u, v }: u = 0..1 along the length (0 = our baseline,
   * 1 = their baseline), v = 0..1 across the width (0 = top sideline). Outside 0..1 = out. */
  const CRT = { W: 420, H: 240, X: 30, Y: 30, L: 360, B: 180 };
  const LAND_KEYS = { kill: 1, ace: 1, block: 1, transKill: 1, attackErr: 1, serveErr: 1, attack: 1, serve: 1, transHit: 1 };
  const outcomeOf = (key) => { const g = STATS[key] && STATS[key].g; return g === 'pts' ? 'pt' : g === 'err' ? 'err' : 'play'; };
  const OUTCOME_NAME = { pt: 'Point', err: 'Error', play: 'In play' };
  const ZFRONT = { their: [2, 3, 4], our: [4, 3, 2] };
  const ZBACK = { their: [1, 6, 5], our: [5, 6, 1] };
  const r3 = (n) => Math.round(n * 1000) / 1000;

  function zoneOf(l) {
    if (l.u < 0 || l.u > 1 || l.v < 0 || l.v > 1) return { side: 'out', z: 0 };
    const side = l.u >= 0.5 ? 'their' : 'our';
    const d = side === 'their' ? (l.u - 0.5) * 2 : (0.5 - l.u) * 2;   // 0 at the net .. 1 at the baseline
    const row = l.v < 1 / 3 ? 0 : l.v < 2 / 3 ? 1 : 2;
    return { side, z: (d < 1 / 3 ? ZFRONT : ZBACK)[side][row] };
  }
  function zoneLabel(l) {
    const z = zoneOf(l);
    return z.side === 'out' ? 'Out' : (z.side === 'their' ? 'Their Z' : 'Our Z') + z.z;
  }
  const landXY = (l) => ({ x: CRT.X + l.u * CRT.L, y: CRT.Y + l.v * CRT.B });

  /* Landing spots picked with the zone buttons are stored at the centre of that zone on their
   * side, plus z = zone number (0 = out), so zoneOf / exports / the hit map read them like a tap. */
  const ZONE_CELLS = [];   // { z, row, front } for their side, in drawing order
  for (let r = 0; r < 3; r++) { ZONE_CELLS.push({ z: ZFRONT.their[r], row: r, front: true }); ZONE_CELLS.push({ z: ZBACK.their[r], row: r, front: false }); }
  function zoneLand(z) {
    if (!z) return { u: 1.05, v: 0.5, z: 0 };
    const c = ZONE_CELLS.find((x) => x.z === z);
    return { u: c.front ? r3(0.5 + 1 / 12) : r3(0.5 + 1 / 6 + 1 / 6), v: r3((c.row + 0.5) / 3), z };
  }
  // Spread zone-button spots around the zone centre on the hit map so they don't stack on one dot.
  function dotXY(e) {
    const p = landXY(e.land);
    if (e.land.z === undefined) return p;
    let h = 0;
    for (const ch of String(e.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const jx = ((h & 255) / 255 - 0.5), jy = (((h >> 8) & 255) / 255 - 0.5);
    return e.land.z ? { x: p.x + jx * CRT.L / 12, y: p.y + jy * CRT.B / 4.5 } : { x: p.x + jx * 12, y: p.y + jy * CRT.B * 0.8 };
  }

  // Rotation: 6 slots in on-screen order  [Z4, Z3, Z2, Z5, Z6, Z1]
  const ZONE_NUM = [4, 3, 2, 5, 6, 1];
  // Clockwise rotation: Z2 -> Z1 -> Z6 -> Z5 -> Z4 -> Z3 -> Z2.  ROTATE_MAP[oldIndex] = newIndex
  const ROTATE_MAP = [1, 2, 5, 0, 3, 4];
  const Z1_INDEX = 5;

  /* ------------------------------------------------------------------ state */
  const KEY = 'dimed.stats.v1';
  const fresh = () => ({
    team: 'Our team', opp: 'Opponent',
    players: [], events: [], set: 1, adj: {},
    rotation: [null, null, null, null, null, null],
    serving: 'us', autoRotate: true, askQuality: true, trackHits: true,
    autoSet: true, bestOf: 5, matchOver: null,
    subs: [], starts: {}, lastLineup: null,
    tab: 'game', selId: null
  });

  function load() {
    const base = fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = Object.assign(base, JSON.parse(raw));
        if (!Array.isArray(s.rotation) || s.rotation.length !== 6) s.rotation = [null, null, null, null, null, null];
        if (!Array.isArray(s.subs)) s.subs = [];
        if (!s.starts || typeof s.starts !== 'object') s.starts = {};
        return s;
      }
    } catch (e) { /* storage unavailable: run in memory */ }
    return base;
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  const U = {
    oppMode: false, pending: null, whoKey: null, zoneIdx: null, resolver: null, onCancel: null, statSet: 'all', installEvt: null,
    land: null,            // landing spot tapped before the play is logged
    wait: null,            // { id } play just logged that is waiting for its landing spot
    waitTimer: null,
    subId: null,           // bench player being subbed in, while the zone sheet is open
    statView: 'table', hitMode: 'dots', hitPlayer: 'all', hitResult: 'all'
  };

  const player = (id) => S.players.find((p) => p.id === id);
  const avatarColor = (p) => {
    const i = S.players.indexOf(p);
    return AVATAR_COLORS[(i < 0 ? 0 : i) % AVATAR_COLORS.length];
  };
  const initials = (n) => n.trim().split(/\s+/).map((w) => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
  const playerLabel = (p) => (p.num ? '#' + p.num + ' ' : '') + p.name;

  /* ------------------------------------------------------------------ derived data */
  function scoringSide(ev) {
    if (ev.pid === 'manual') return ev.side || null;
    const d = STATS[ev.key];
    if (!d || !d.score) return null;
    if (ev.pid === 'opp') return d.score === 'us' ? 'them' : 'us';
    return d.score;
  }

  function scoreFor(setN) {
    let us = 0, them = 0;
    for (const e of S.events) {
      if (e.set !== setN) continue;
      const side = scoringSide(e);
      if (side === 'us') us++; else if (side === 'them') them++;
    }
    const a = S.adj[setN] || { us: 0, them: 0 };
    return { us: clamp0(us + a.us), them: clamp0(them + a.them) };
  }

  /* Sets go to 25 (the deciding set to 15), win by 2. */
  const setsToWin = () => Math.ceil(S.bestOf / 2);
  const setTarget = (n) => (n >= S.bestOf ? 15 : 25);
  function setWinner(n) {
    const sc = scoreFor(n), t = setTarget(n);
    if (Math.max(sc.us, sc.them) < t || Math.abs(sc.us - sc.them) < 2) return null;
    return sc.us > sc.them ? 'us' : 'them';
  }
  // Sets won so far, counting every set before the current one (and the current one once the match is over).
  function setsWon() {
    const w = { us: 0, them: 0 };
    const last = S.matchOver ? S.set : S.set - 1;
    for (let n = 1; n <= last; n++) {
      const sc = scoreFor(n);
      if (sc.us > sc.them) w.us++; else if (sc.them > sc.us) w.them++;
    }
    return w;
  }
  // Who served first in a set: the serving side before its first rally that scored.
  function firstServer(n) {
    const e = S.events.find((ev) => ev.set === n && scoringSide(ev));
    return e ? e.ps : null;
  }

  const blank = () => { const r = { qs: 0, qn: 0 }; STAT_KEYS.forEach((k) => { r[k] = 0; }); return r; };

  function compute(setFilter) {
    const m = {};
    S.players.forEach((p) => { m[p.id] = blank(); });
    for (const e of S.events) {
      if (setFilter !== 'all' && e.set !== Number(setFilter)) continue;
      const r = m[e.pid];
      if (!r || !(e.key in r)) continue;
      r[e.key]++;
      if (e.q) { r.qs += e.q; r.qn++; }
    }
    return m;
  }

  function oppCounts() {
    const c = {};
    for (const e of S.events) if (e.pid === 'opp' && e.set === S.set) c[e.key] = (c[e.key] || 0) + 1;
    return c;
  }

  function sumRecords(list) {
    const t = blank();
    list.forEach((r) => { Object.keys(t).forEach((k) => { t[k] += r[k]; }); });
    return t;
  }

  const pts = (r) => r.kill + r.ace + r.block + r.transKill;
  const errs = (r) => r.attackErr + r.serveErr + r.recErr + r.netErr;
  const att = (r) => r.kill + r.attack + r.attackErr;
  const srv = (r) => r.serve + r.ace + r.serveErr;

  // Column definitions shared by the on-screen table and the Excel export.
  const COLS = [
    { h: 'Pts',  t: 'Points scored: kills + aces + block kills + transition kills', g: 'pts', f: pts },
    { h: 'K',    t: 'Kills', g: 'pts', f: (r) => r.kill },
    { h: 'Ace',  t: 'Service aces', g: 'pts', f: (r) => r.ace },
    { h: 'BK',   t: 'Block kills', g: 'pts', f: (r) => r.block },
    { h: 'TK',   t: 'Transition kills', g: 'pts', f: (r) => r.transKill },
    { h: 'Att',  t: 'Attack attempts: kills + other attacks + attack errors', g: 'skill', f: att },
    { h: 'Hit%', t: 'Hitting percentage: (kills - attack errors) / attempts', g: 'skill', fmt: 'dec3', f: (r) => (att(r) ? (r.kill - r.attackErr) / att(r) : null) },
    { h: 'Srv',  t: 'Total serves: serves in + aces + serve errors', g: 'skill', f: srv },
    { h: 'Srv%', t: 'Serve in %: (serves in + aces) / total serves', g: 'skill', fmt: 'dec3', f: (r) => (srv(r) ? (r.serve + r.ace) / srv(r) : null) },
    { h: 'BA',   t: 'Block assists (credit only, no point)', g: 'skill', f: (r) => r.blockAss },
    { h: 'Dig',  t: 'Digs', g: 'skill', f: (r) => r.dig },
    { h: 'Ast',  t: 'Assists', g: 'skill', f: (r) => r.assist },
    { h: 'Set',  t: 'Sets (non-assist)', g: 'skill', f: (r) => r.set },
    { h: 'Pass', t: 'Passes', g: 'skill', f: (r) => r.recPass },
    { h: 'TH',   t: 'Transition hits', g: 'trans', f: (r) => r.transHit },
    { h: 'TD',   t: 'Transition digs', g: 'trans', f: (r) => r.transDig },
    { h: 'TB',   t: 'Transition blocks', g: 'trans', f: (r) => r.transBlock },
    { h: 'TS',   t: 'Transition sets', g: 'trans', f: (r) => r.transSet },
    { h: 'AE',   t: 'Attack errors', g: 'err', f: (r) => r.attackErr },
    { h: 'SE',   t: 'Serve errors', g: 'err', f: (r) => r.serveErr },
    { h: 'RE',   t: 'Reception errors', g: 'err', f: (r) => r.recErr },
    { h: 'NE',   t: 'Net / foot faults', g: 'err', f: (r) => r.netErr },
    { h: 'Err',  t: 'Total errors', g: 'err', f: errs },
    { h: 'Avg Q', t: 'Average quality rating (1 poor – 4 perfect)', g: 'skill', fmt: 'dec2', f: (r) => (r.qn ? r.qs / r.qn : null) }
  ];

  const fmtCell = (col, v) => {
    if (v === null || v === undefined) return '–';
    if (col.fmt === 'dec3') { const s = Math.abs(v).toFixed(3); return (v < 0 ? '-' : '') + (s.indexOf('0') === 0 ? s.slice(1) : s); }
    if (col.fmt === 'dec2') return v.toFixed(2);
    return String(v);
  };
  const exportCell = (col, v) => {
    if (v === null || v === undefined) return null;
    if (col.fmt === 'dec3') return Math.round(v * 1000) / 1000;
    if (col.fmt === 'dec2') return Math.round(v * 100) / 100;
    return v;
  };

  /* ------------------------------------------------------------------ game logic */
  function rotateTeam() {
    const prev = S.rotation.slice();
    for (let i = 0; i < 6; i++) S.rotation[ROTATE_MAP[i]] = prev[i];
  }
  function unrotateTeam() {
    const prev = S.rotation.slice();
    for (let i = 0; i < 6; i++) S.rotation[i] = prev[ROTATE_MAP[i]];
  }

  /* Lineups and subs. Stats belong to the player, so a sub only changes who stands in a zone. */
  const EMPTY_COURT = () => [null, null, null, null, null, null];
  const onCourtIds = () => S.rotation.filter((id) => id && player(id));
  // Put pid in rotation slot i. Replacing someone counts as a substitution for this set.
  function putInZone(i, pid) {
    const out = S.rotation[i];
    const from = S.rotation.indexOf(pid);
    if (from >= 0) S.rotation[from] = null;
    S.rotation[i] = pid;
    if (out && out !== pid && player(out)) S.subs.push({ set: S.set, inId: pid, outId: out, z: ZONE_NUM[i], ts: Date.now() });
  }
  const subsThisSet = () => S.subs.filter((x) => x.set === S.set).length;
  // Each set starts with an empty court; the last lineup is kept so it can be reused.
  function clearForNewSet() {
    if (S.rotation.some(Boolean)) S.lastLineup = S.rotation.slice();
    S.rotation = EMPTY_COURT();
    S.selId = null;
  }
  const reuseLabel = () => (S.set > 1 ? 'Same lineup as set ' + (S.set - 1) : 'Last lineup');
  // Lineup offered for reuse: the previous set's starting six, else how the court looked when it ended.
  function prevLineup() {
    const l = S.starts[S.set - 1] || S.lastLineup;
    if (!l || !l.some((id) => id && player(id))) return null;
    return l.map((id) => (id && player(id) ? id : null));
  }

  // Returns true if the team rotated because of this point.
  function applyPoint(side) {
    let rotated = false;
    if (side === 'us') {
      if (S.serving === 'them' && S.autoRotate && S.rotation.some(Boolean)) { rotateTeam(); rotated = true; }
      S.serving = 'us';
    } else {
      S.serving = 'them';
    }
    return rotated;
  }

  /* Landing spots: tap the court first (U.land) and the next hit-type play takes it, or log the
   * play first and tap the court within WAIT_MS to add it to that play. */
  const WAIT_MS = 20000;
  function clearWait() { U.wait = null; clearTimeout(U.waitTimer); U.waitTimer = null; }
  function startWait(id) {
    clearWait();
    U.wait = { id };
    U.waitTimer = setTimeout(() => { U.wait = null; updateHitCard(); }, WAIT_MS);
  }
  // Called when a play is about to be logged. Returns the pending landing (or null) and clears it.
  function takeLand(key, isOpp) {
    if (!S.trackHits || !LAND_KEYS[key]) return null;
    const l = U.land;
    U.land = null;
    return isOpp ? null : l;
  }

  function pushEvent(pid, key, q, side, land) {
    const p = player(pid);
    const ev = {
      id: uid(), set: S.set, pid, key, q: q || null, ts: Date.now(), ps: S.serving, rot: false,
      pn: p ? p.name : '', pnum: p ? p.num : '', ppos: p ? p.pos : ''
    };
    if (side) ev.side = side;
    if (land) { ev.land = { u: r3(land.u), v: r3(land.v) }; if (land.z !== undefined) ev.land.z = land.z; }
    if (!S.starts[S.set] && S.rotation.some(Boolean)) S.starts[S.set] = S.rotation.slice();
    const scorer = scoringSide(ev);
    if (scorer) ev.rot = applyPoint(scorer);
    S.events.push(ev);
    const ended = scorer && S.autoSet ? setWinner(S.set) : null;
    if (ended) endSet(ev, ended);
    if (p) S.selId = null;   // a pick lasts one play, so the next action can be tapped first
    clearWait();
    if (!ev.land && p && S.trackHits && LAND_KEYS[key]) startWait(ev.id);
    save();
    render();
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* ignore */ } }
    if (ended) setOverModal(ev);
    return ended ? null : scorer;
  }

  // The point in ev just won set S.set for `side`: start the next set, or end the match.
  function endSet(ev, side) {
    ev.endSet = side;
    const w = setsWon();
    w[side]++;
    if (w[side] >= setsToWin()) { S.matchOver = side; return; }
    const first = firstServer(S.set);
    ev.lineup = S.rotation.slice();   // lets Undo put the court back
    S.set++;
    clearForNewSet();
    // Serve alternates each set; the deciding set is a coin toss, so leave it for the scorer to check.
    if (first) S.serving = first === 'us' ? 'them' : 'us';
  }

  function setOverModal(ev) {
    $('#toast').classList.remove('show');
    const n = ev.set, sc = scoreFor(n), w = setsWon(), side = ev.endSet;
    const name = side === 'us' ? S.team : S.opp;
    const title = S.matchOver ? name + ' win the match' : name + ' win set ' + n;
    const msg = 'Set ' + n + ': ' + sc.us + '–' + sc.them + '. Sets ' + w.us + '–' + w.them + '. ' +
      (S.matchOver ? 'Export your stats from the Stats tab, or start a new match under More.'
        : 'Set ' + S.set + ' is up, first to ' + setTarget(S.set) + '. ' + (S.serving === 'us' ? S.team : S.opp) + ' serves first' +
          (S.set >= S.bestOf ? ' (check the coin toss).' : '.'));
    openModal(
      '<h3>' + esc(title) + '</h3><p class="sub">' + esc(msg) + '</p>' +
      (S.matchOver ? '' : '<p class="sub">The court is empty for set ' + S.set + '. Pick the starting six.</p>') +
      '<div class="btn-row">' + (S.matchOver ? '<button class="btn" data-a="askNo">Done</button>' : setStartButtons()) +
      '<button class="btn alt" data-a="undoSetPoint">Undo last point</button></div>');
  }

  function setStartButtons() {
    return (prevLineup() ? '<button class="btn" data-a="reuseLineup">' + ic('rotate') + ' ' + reuseLabel() + '</button>' : '') +
      '<button class="btn' + (prevLineup() ? ' alt' : '') + '" data-a="pickLineup">' + ic('court') + ' Pick lineup</button>';
  }

  function undo() {
    const last = S.events[S.events.length - 1];
    // A set-winning point can still be undone from the start of the next set.
    const reopen = last && last.endSet && (last.set === S.set || last.set === S.set - 1);
    if (!last || (last.set !== S.set && !reopen)) { toast('Nothing to undo in this set'); return; }
    S.events.pop();
    if (reopen) { S.set = last.set; S.matchOver = null; if (last.lineup) S.rotation = last.lineup.slice(); S.subs = S.subs.filter((x) => x.set <= last.set); }
    if (!S.events.some((e) => e.set === last.set)) delete S.starts[last.set];
    S.serving = last.ps;
    if (last.rot) unrotateTeam();
    if (U.wait && U.wait.id === last.id) clearWait();
    save();
    render();
    toast('Undid: ' + describe(last));
  }

  function describe(ev) {
    if (ev.pid === 'manual') return 'Manual point';
    const who = ev.pid === 'opp' ? S.opp : (ev.pn || 'Player');
    return who + ' – ' + (STATS[ev.key] ? STATS[ev.key].label : ev.key);
  }

  function tapStat(key, pid) {
    if (U.oppMode) {
      U.oppMode = false;
      takeLand(key, true);   // their plays are never stored, so a pending spot is just dropped
      if (matchLocked()) { render(); return; }
      const scorer = pushEvent('opp', key, null);
      toast(S.opp + ': ' + STATS[key].label + (scorer ? ' · +1 ' + (scorer === 'us' ? S.team : S.opp) : ''));
      return;
    }
    if (matchLocked()) return;
    if (!pid || !player(pid)) { openWho(key); return; }
    if (STATS[key].q && S.askQuality) { openRate(pid, key); return; }
    const p = player(pid);
    const scorer = pushEvent(pid, key, null, null, takeLand(key, false));
    toast(p.name + ': ' + STATS[key].label + (scorer ? ' · +1 ' + (scorer === 'us' ? S.team : S.opp) : ''));
  }

  function matchLocked() {
    if (!S.matchOver) return false;
    toast('Match is over. Undo the last point or start a new match under More.');
    return true;
  }

  /* ------------------------------------------------------------------ toast + modal */
  let toastTimer = null;
  function toast(msg) {
    if (!$('#modal').hidden) return;   // the open sheet already says what happened
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function openModal(html, onCancel) {
    U.onCancel = onCancel || null;
    const m = $('#modal');
    m.innerHTML = '<div class="backdrop" data-a="backdrop"><div class="sheet" role="dialog" aria-modal="true">' + html + '</div></div>';
    m.hidden = false;
  }
  function closeModal(cancelled) {
    const cb = U.onCancel;
    U.onCancel = null;
    U.pending = null;
    U.whoKey = null;
    const m = $('#modal');
    m.hidden = true;
    m.innerHTML = '';
    if (cancelled && cb) cb();
  }

  function ask(title, msg, okLabel, danger) {
    return new Promise((resolve) => {
      U.resolver = resolve;
      openModal(
        '<h3>' + esc(title) + '</h3><p class="sub">' + esc(msg) + '</p>' +
        '<div class="btn-row"><button class="btn ' + (danger ? 'pinkb' : '') + '" data-a="askYes">' + esc(okLabel) + '</button>' +
        '<button class="btn alt" data-a="askNo">Cancel</button></div>',
        () => { const r = U.resolver; U.resolver = null; if (r) r(false); }
      );
    });
  }

  function openRate(pid, key) {
    U.pending = { pid, key };
    const p = player(pid);
    openModal(
      '<h3>Rate the ' + esc(STATS[key].label.toLowerCase()) + '</h3>' +
      '<p class="sub">' + esc(playerLabel(p)) + ' · tap a rating, or tap outside to cancel' +
      (S.trackHits && LAND_KEYS[key] && U.land ? '<span class="spot-ok">' + ic('pin') + ' Landing spot saved</span>' : '') + '</p>' +
      '<div class="rate-grid">' +
      RATINGS.map((r) => '<button class="rate r' + r.q + '" data-a="rate" data-q="' + r.q + '"><kbd>' + r.q + '</kbd>' + r.name + '<small>' + r.hint + '</small></button>').join('') +
      '</div><button class="skip" data-a="rate" data-q="0">Log without a rating</button>'
    );
    // Keep U.pending alive through openModal (it only clears on close).
    U.pending = { pid, key };
  }

  // Action tapped before a player: ask who made the play, on-court players first.
  function openWho(key) {
    const courtIds = [1, 2, 3, 4, 5, 6].map((z) => S.rotation[ZONE_NUM.indexOf(z)]).filter((id) => id && player(id));
    const list = courtIds.map(player).concat(S.players.filter((p) => courtIds.indexOf(p.id) < 0));
    const pickBtn = (p) => '<button class="pick" data-a="who" data-id="' + p.id + '"><span class="avatar" style="background:' + avatarColor(p) + '">' + esc(initials(p.name)) +
      (courtIds.indexOf(p.id) >= 0 ? '<span class="zone-badge">' + ZONE_NUM[S.rotation.indexOf(p.id)] + '</span>' : '') + '</span>' +
      '<span class="pinfo"><span class="pname">' + esc(playerLabel(p)) + '</span><span class="psub">' + esc(p.pos) + '</span></span></button>';
    openModal(
      '<h3>Who got the ' + esc(STATS[key].label.toLowerCase()) + '?</h3>' +
      '<p class="sub">Tap the player, or tap outside to cancel' +
      (S.trackHits && LAND_KEYS[key] && U.land ? '<span class="spot-ok">' + ic('pin') + ' Landing spot saved</span>' : '') + '</p>' +
      '<div class="pick-list who-list">' + list.map(pickBtn).join('') + '</div>'
    );
    U.whoKey = key;
  }

  /* ------------------------------------------------------------------ render */
  function render() {
    renderScoreboard();
    renderTabs();
    renderAppbar();
    const view = $('#view');
    const scrollY = window.scrollY;
    const strip = $('.players', view);
    const stripLeft = strip ? strip.scrollLeft : 0;
    view.innerHTML = VIEWS[S.tab]();
    const strip2 = $('.players', view);
    if (strip2) strip2.scrollLeft = stripLeft;
    window.scrollTo(0, scrollY);
  }

  function renderAppbar() {
    $('#appbarRight').innerHTML = U.installEvt
      ? '<button class="pill-link" data-a="install">' + ic('download') + ' Install app</button>'
      : '';
  }

  function renderScoreboard() {
    const sc = scoreFor(S.set);
    const hist = [];
    for (let n = 1; n < (S.matchOver ? S.set + 1 : S.set); n++) { const h = scoreFor(n); hist.push('<span>S' + n + ' ' + h.us + '–' + h.them + '</span>'); }
    const w = setsWon();
    $('#scoreboard').innerHTML =
      '<div class="team us ' + (S.serving === 'us' ? 'serving' : '') + '">' +
        '<div class="team-name">' + esc(S.team) + '</div>' +
        '<div class="team-score">' + sc.us + '</div>' +
        '<div class="serve-flag ' + (S.serving === 'us' ? '' : 'off') + '">' + ic('ball').replace('class="ic"', 'class="ic" style="width:12px;height:12px"') + ' Serving</div>' +
        '<div class="adj"><button data-a="adj" data-side="us" data-d="-1" aria-label="Subtract a point from ' + esc(S.team) + '">−</button>' +
        '<button data-a="adj" data-side="us" data-d="1" aria-label="Add a point to ' + esc(S.team) + '">+</button></div>' +
      '</div>' +
      '<div class="mid">' +
        '<div class="set-chip' + (S.matchOver ? ' final' : '') + '">' + (S.matchOver ? 'FINAL' : 'SET ' + S.set) + '</div>' +
        '<div class="sets-won" title="Sets won">Sets ' + w.us + '–' + w.them + '</div>' +
        (S.matchOver
          ? '<div class="match-result">' + esc(S.matchOver === 'us' ? S.team : S.opp) + ' win</div>'
          : '<button class="serve-toggle" data-a="toggleServe" title="Switch who is serving">' + ic('swap') + ' Serve: ' + (S.serving === 'us' ? 'Us' : 'Them') + '</button>' +
            '<button class="serve-toggle" data-a="endSet">' + ic('plus') + ' Next set</button>') +
        (hist.length ? '<div class="set-history">' + hist.join('') + '</div>' : '') +
      '</div>' +
      '<div class="team them ' + (S.serving === 'them' ? 'serving' : '') + '">' +
        '<div class="team-name">' + esc(S.opp) + '</div>' +
        '<div class="team-score">' + sc.them + '</div>' +
        '<div class="serve-flag ' + (S.serving === 'them' ? '' : 'off') + '">' + ic('ball').replace('class="ic"', 'class="ic" style="width:12px;height:12px"') + ' Serving</div>' +
        '<div class="adj"><button data-a="adj" data-side="them" data-d="-1" aria-label="Subtract a point from ' + esc(S.opp) + '">−</button>' +
        '<button data-a="adj" data-side="them" data-d="1" aria-label="Add a point to ' + esc(S.opp) + '">+</button></div>' +
      '</div>';
  }

  const TABS = [['game', 'Game', 'play'], ['court', 'Court', 'court'], ['roster', 'Roster', 'users'], ['stats', 'Stats', 'table'], ['more', 'More', 'gear']];
  function renderTabs() {
    $('#tabs').innerHTML = TABS.map((t) =>
      '<button class="tab ' + (S.tab === t[0] ? 'active' : '') + '" data-a="tab" data-tab="' + t[0] + '">' + ic(t[2]) + '<span>' + t[1] + '</span></button>'
    ).join('');
  }

  /* ---- court drawing (shared by the live tracker and the hit map) ---- */
  function courtSvg(inner, attrs, zoneNums) {
    const X = CRT.X, Y = CRT.Y, L = CRT.L, B = CRT.B, mid = X + L / 2, a = L / 6;
    let nums = '';
    if (zoneNums !== false) {
      const ys = [Y + B / 6, Y + B / 2, Y + B * 5 / 6];
      [['their', 1], ['our', -1]].forEach((s) => {
        const fx = mid + s[1] * a / 2, bx = mid + s[1] * (a + (L / 2 - a) / 2);
        for (let r = 0; r < 3; r++) {
          nums += '<text class="zn" x="' + fx + '" y="' + ys[r] + '">' + ZFRONT[s[0]][r] + '</text>' +
            '<text class="zn" x="' + bx + '" y="' + ys[r] + '">' + ZBACK[s[0]][r] + '</text>';
        }
      });
    }
    return '<svg class="courtsvg" viewBox="0 0 ' + CRT.W + ' ' + CRT.H + '" ' + (attrs || '') + '>' +
      '<rect class="cv-out" width="' + CRT.W + '" height="' + CRT.H + '"/>' +
      '<rect class="cv-court" x="' + X + '" y="' + Y + '" width="' + L + '" height="' + B + '"/>' +
      '<path class="cv-att" d="M' + (mid - a) + ' ' + Y + 'V' + (Y + B) + 'M' + (mid + a) + ' ' + Y + 'V' + (Y + B) + '"/>' +
      nums +
      '<text class="cv-lbl" x="' + (X + 2) + '" y="21">OUR COURT</text>' +
      '<text class="cv-lbl end" x="' + (X + L - 2) + '" y="21">THEIR COURT</text>' +
      '<path class="cv-net-glow" d="M' + mid + ' ' + (Y - 8) + 'V' + (Y + B + 8) + '"/>' +
      '<path class="cv-net" d="M' + mid + ' ' + (Y - 8) + 'V' + (Y + B + 8) + '"/>' +
      inner + '</svg>';
  }

  function dotSvg(e, strong) {
    const p = dotXY(e);
    const what = (STATS[e.key] ? STATS[e.key].label : e.key) + ' · ' + zoneLabel(e.land);
    return '<circle class="ld ' + outcomeOf(e.key) + (strong ? ' last' : '') + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) +
      '" r="' + (strong ? 8 : 6.5) + '"><title>' + esc((e.pn ? e.pn + ' · ' : '') + what) + '</title></circle>';
  }

  function updateHitCard() {
    const el = $('#hitCard');
    if (el) el.outerHTML = hitCardHtml();
  }

  // Live zone picker: their half of the court seen from our bench (net at the bottom), split into
  // the six standard zones as big buttons, with an Out strip past their baseline.
  const ZC = { W: 300, H: 336, X: 20, Y: 44, S: 260 };
  function zoneCourtSvg(counts) {
    const X = ZC.X, Y = ZC.Y, S3 = ZC.S / 3, net = Y + ZC.S, att = net - S3;
    const sel = U.land && U.land.z !== undefined ? U.land.z : null;
    const cells = ZONE_CELLS.map((c) => {
      const x = X + c.row * S3, y = c.front ? att : Y, w = S3, h = c.front ? S3 : ZC.S - S3;
      const cx = x + w / 2, cy = y + h / 2;
      const n = counts[c.z] || 0;
      return '<g class="zbtn' + (sel === c.z ? ' on' : '') + '" data-a="hitZone" data-z="' + c.z + '" role="button" tabindex="0" aria-label="Zone ' + c.z + '">' +
        '<rect class="zb-hit" x="' + (x + 4) + '" y="' + (y + 4) + '" width="' + (w - 8) + '" height="' + (h - 8) + '" rx="8"/>' +
        '<circle class="zb-badge" cx="' + cx + '" cy="' + cy + '" r="21"/>' +
        '<text class="zb-num" x="' + cx + '" y="' + cy + '">' + c.z + '</text>' +
        (n ? '<text class="zb-cnt" x="' + (x + w - 10) + '" y="' + (y + 18) + '">' + n + '</text>' : '') + '</g>';
    }).join('');
    const outN = counts[0] || 0;
    return '<svg class="courtsvg zcourt" viewBox="0 0 ' + ZC.W + ' ' + ZC.H + '" role="group" aria-label="Their court. Tap the zone where the ball landed.">' +
      '<rect class="vc-free" width="' + ZC.W + '" height="' + ZC.H + '"/>' +
      '<g class="zbtn out' + (sel === 0 ? ' on' : '') + '" data-a="hitZone" data-z="0" role="button" tabindex="0" aria-label="Out">' +
        '<rect class="zb-out" x="' + X + '" y="6" width="' + ZC.S + '" height="' + (Y - 14) + '" rx="8"/>' +
        '<text class="zb-outlbl" x="' + (X + ZC.S / 2) + '" y="' + (6 + (Y - 14) / 2) + '">OUT' + (outN ? ' · ' + outN : '') + '</text></g>' +
      '<rect class="vc-floor" x="' + X + '" y="' + Y + '" width="' + ZC.S + '" height="' + ZC.S + '"/>' +
      '<path class="vc-div" d="M' + (X + S3) + ' ' + Y + 'V' + net + 'M' + (X + 2 * S3) + ' ' + Y + 'V' + net + '"/>' +
      '<rect class="vc-line" x="' + X + '" y="' + Y + '" width="' + ZC.S + '" height="' + ZC.S + '"/>' +
      '<path class="vc-line" d="M' + X + ' ' + att + 'H' + (X + ZC.S) + '"/>' +
      cells +
      '<rect class="vc-net" x="' + (X - 12) + '" y="' + (net - 3) + '" width="' + (ZC.S + 24) + '" height="6" rx="3"/>' +
      '<circle class="vc-post" cx="' + (X - 12) + '" cy="' + net + '" r="5"/><circle class="vc-post" cx="' + (X + ZC.S + 12) + '" cy="' + net + '" r="5"/>' +
      '<text class="vc-lbl" x="' + (ZC.W / 2) + '" y="' + (net + 18) + '">NET</text>' +
      '</svg>';
  }

  function hitCardHtml() {
    const wait = U.wait && S.events.find((e) => e.id === U.wait.id);
    const recent = S.events.filter((e) => e.land && e.set === S.set && player(e.pid));
    const counts = {};
    recent.forEach((e) => { const z = zoneOf(e.land); if (z.side === 'their') counts[z.z] = (counts[z.z] || 0) + 1; else if (z.side === 'out') counts[0] = (counts[0] || 0) + 1; });
    let status, btn = '';
    if (wait) {
      status = ic('pin') + '<span>Tap the zone for <b>' + esc(wait.pn) + ' · ' + esc(STATS[wait.key].label) + '</b></span>';
      btn = '<button class="mini" data-a="hitSkip">Skip</button>';
    } else if (U.land) {
      status = ic('pin') + '<span><b>' + esc(U.land.z === 0 ? 'Out' : 'Zone ' + (U.land.z !== undefined ? U.land.z : zoneOf(U.land).z)) + ' saved.</b> Now tap the action.</span>';
      btn = '<button class="mini" data-a="hitClear">Clear</button>';
    } else {
      status = ic('pin') + '<span>Tap the zone where the spike landed, then log the play.</span>';
    }
    return '<section class="hit ' + (wait ? 'wait' : U.land ? 'armed' : '') + '" id="hitCard">' +
      '<div class="hit-head"><span class="hit-title">Where did it land?</span>' +
      '<span class="live-chip"><i></i>' + recent.length + ' this set</span></div>' +
      '<div class="hit-court">' + zoneCourtSvg(counts) + '</div>' +
      '<div class="hit-status">' + status + btn + '</div></section>';
  }

  /* ---- game view ---- */
  function emptyRoster() {
    return '<div class="card" style="text-align:center;padding:32px 16px">' +
      '<h2 style="justify-content:center;font-size:20px">Add your players to start tracking</h2>' +
      '<p class="hint" style="margin-bottom:16px">Build your roster once and it stays saved on this device.</p>' +
      '<div class="btn-row" style="justify-content:center">' +
      '<button class="btn" data-a="tab" data-tab="roster">' + ic('users') + ' Build roster</button>' +
      '<button class="btn alt" data-a="sample">' + ic('wand') + ' Load sample team</button></div></div>';
  }

  function playerCard(p, rec, zone, subBtn) {
    const selected = S.selId === p.id && !U.oppMode;
    const avg = rec.qn ? (rec.qs / rec.qn).toFixed(1) : '';
    let quick = '';
    if (selected) {
      quick = '<div class="quick">' + QUICK.map((q) =>
        '<button class="qbtn ' + q[1] + '" data-a="stat" data-key="' + q[0] + '" data-id="' + p.id + '">' +
        q[2] + '<b>' + rec[q[0]] + '</b></button>'
      ).join('') + '</div>';
    }
    const sub = subBtn ? '<button class="sub-btn' + (zone ? ' out' : '') + '" data-a="sub" data-id="' + p.id + '" aria-label="' + (zone ? 'Sub ' + esc(p.name) + ' out' : 'Sub ' + esc(p.name) + ' in') + '">' +
      ic('swap') + '<span>' + (zone ? 'Out' : 'In') + '</span></button>' : '';
    return '<div class="pcard ' + (selected ? 'selected' : '') + '"><div class="pcard-row">' +
      '<button class="pcard-top" data-a="pick" data-id="' + p.id + '">' +
        '<span class="avatar" style="background:' + avatarColor(p) + '">' + esc(initials(p.name)) +
        (zone ? '<span class="zone-badge">' + zone + '</span>' : '') + '</span>' +
        '<span class="pinfo"><span class="pname">' + esc(playerLabel(p)) + '</span>' +
        '<span class="psub"><span>' + esc(p.pos) + '</span><span>' + pts(rec) + ' pts</span>' + (avg ? '<span>Q ' + avg + '</span>' : '') + '</span></span>' +
      '</button>' + sub + '</div>' + quick + '</div>';
  }

  // Shown on the Game screen while the court is empty, e.g. at the start of every set.
  function lineupCard() {
    const prev = prevLineup();
    return '<div class="lineup-card"><div class="lc-title">Set ' + S.set + ' lineup</div>' +
      '<p>The court is empty. Tap <b>In</b> on a player to put them in a zone' + (prev ? ', or reuse the last one.' : '.') + '</p>' +
      '<div class="lc-btns">' + setStartButtons() + '</div></div>';
  }

  function viewGame() {
    if (!S.players.length) return emptyRoster();
    const stats = compute('all');
    const sel = player(S.selId);
    const onCourt = [];
    const courtIds = {};
    // list by zone number 1..6
    [1, 2, 3, 4, 5, 6].forEach((z) => {
      const idx = ZONE_NUM.indexOf(z);
      const pid = S.rotation[idx];
      const p = pid && player(pid);
      if (p) { onCourt.push([p, z]); courtIds[p.id] = true; }
    });
    const bench = S.players.filter((p) => !courtIds[p.id]);
    const nSubs = subsThisSet();
    let list = '';
    if (onCourt.length) {
      list = '<div class="col-title"><span>On court</span>' + (onCourt.length < 6 ? '<span class="lc-count">' + onCourt.length + ' of 6</span>' : '') + '</div>' +
        onCourt.map((x) => playerCard(x[0], stats[x[0].id], x[1], true)).join('');
    } else if (!S.matchOver) {
      list = lineupCard();
    }
    if (bench.length) {
      list += '<div class="bench-label"><span>Bench</span>' + (nSubs ? '<span>' + nSubs + ' sub' + (nSubs === 1 ? '' : 's') + ' this set</span>' : '') + '</div>' +
        bench.map((p) => playerCard(p, stats[p.id], 0, !S.matchOver)).join('');
    }

    const rec = sel ? stats[sel.id] : null;
    const oc = oppCounts();
    const who = U.oppMode
      ? '<div class="who"><small>Logging for</small>' + esc(S.opp) + ' – tap an action</div>'
      : sel ? '<div class="who"><small>Logging for</small>' + esc(playerLabel(sel)) + '</div>' +
        '<button class="chip-btn" data-a="unpick" title="Tap an action first, then pick the player">Clear</button>'
      : '<div class="who"><small>No player selected</small>Tap an action, then pick who made it</div>';

    const groups = GROUPS.map((g) => {
      const tiles = g.keys.map((k) => {
        const d = STATS[k];
        const n = U.oppMode ? (oc[k] || 0) : (rec ? rec[k] : 0);
        return '<button class="tile ' + g.id + '" data-a="stat" data-key="' + k + '"><span>' + d.label +
          (d.note ? '<span class="note">' + d.note + '</span>' : '') + '</span><span class="cnt">' + n + '</span></button>';
      }).join('');
      let note = '';
      if (g.id === 'pts') note = U.oppMode ? '+1 ' + esc(S.opp) : '+1 ' + esc(S.team);
      if (g.id === 'err') note = U.oppMode ? '+1 ' + esc(S.team) : '+1 ' + esc(S.opp);
      return '<section class="group ' + g.id + '"><div class="group-head"><span class="dot"></span>' + g.title +
        (note ? '<small>' + note + '</small>' : '') + '</div><div class="tiles">' + tiles + '</div></section>';
    }).join('');

    const recent = S.events.slice(-8).reverse().map((e) => {
      const d = STATS[e.key];
      const side = scoringSide(e);
      const who2 = e.pid === 'opp' ? S.opp : e.pid === 'manual' ? 'Manual' : (e.pn || 'Player');
      const what = e.pid === 'manual' ? 'Point added' : (d ? d.label : e.key);
      const color = e.pid === 'manual' ? '#64748B' : (d ? GROUP_DOT[d.g] : '#64748B');
      return '<div class="feed-row"><span class="dotc" style="background:' + color + '"></span>' +
        '<span class="who">' + esc(who2) + '</span><span class="what">' + esc(what) + '</span>' +
        (e.land ? '<span class="badge zn">' + zoneLabel(e.land) + '</span>' : '') +
        (e.q ? '<span class="badge q' + e.q + '">' + RATING_NAME[e.q] + '</span>' : '') +
        (side ? '<span class="badge pt-' + side + '">+1 ' + esc(side === 'us' ? S.team : S.opp) + '</span>' : '') +
        '<span class="time">' + new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span></div>';
    }).join('');

    return '<div class="game' + (S.trackHits ? '' : ' nohit') + '">' +
      '<aside class="g-players"><div class="players">' + list + '</div></aside>' +
      '<div class="g-sel"><div class="selbar">' + who +
        '<button class="chip-btn opp ' + (U.oppMode ? 'on' : '') + '" data-a="opp">' + ic('users') + (U.oppMode ? ' Cancel' : ' Their player') + '</button>' +
        '<button class="chip-btn dark" data-a="undo">' + ic('undo') + ' Undo</button></div></div>' +
      (S.trackHits ? '<div class="g-hit">' + hitCardHtml() + '</div>' : '') +
      '<div class="g-controls controls">' + groups +
        '<section class="feed"><div class="col-title" style="padding:12px 14px 0"><span>Recent plays</span></div>' +
        (recent || '<div class="empty">Plays you log will show up here.</div>') + '</section>' +
      '</div></div>';
  }

  /* ---- court view ---- */
  function viewCourt() {
    const stats = compute('all');
    const zones = S.rotation.map((pid, i) => {
      const p = pid && player(pid);
      const z = ZONE_NUM[i];
      const serveBadge = i === Z1_INDEX && S.serving === 'us' ? '<span class="serve-ball">Serve</span>' : '';
      if (p) {
        return '<button class="zone filled" style="background:' + avatarColor(p) + '" data-a="zone" data-i="' + i + '">' +
          '<span class="znum">Z' + z + '</span>' + serveBadge +
          '<span class="zname">' + esc(playerLabel(p)) + '</span><span class="zpos">' + esc(p.pos) + ' · ' + pts(stats[p.id]) + ' pts</span></button>';
      }
      return '<button class="zone" data-a="zone" data-i="' + i + '"><span class="znum">Z' + z + '</span>' + serveBadge +
        '<span class="zempty">' + ic('plus') + '<br>Add player</span></button>';
    }).join('');
    return '<div class="court-wrap">' +
      '<div class="court"><div class="net"></div><div class="court-grid">' + zones + '</div>' +
      '<div class="court-note">Front row on top · Zone 1 serves</div></div>' +
      (!S.rotation.some(Boolean) && prevLineup() && !S.matchOver
        ? '<div class="court-actions"><button class="btn green" data-a="reuseLineup">' + ic('rotate') + ' ' + reuseLabel() + '</button></div>' : '') +
      '<div class="court-actions">' +
        '<button class="btn" data-a="rotate">' + ic('rotate') + ' Rotate clockwise</button>' +
        '<button class="btn alt" data-a="unrotate">' + ic('rotateBack') + ' Rotate back</button>' +
        '<button class="btn alt" data-a="autofill">' + ic('wand') + ' Fill first six</button>' +
        '<button class="btn danger" data-a="clearCourt">' + ic('trash') + ' Clear</button></div>' +
      '<p class="hint">' + (S.autoRotate ? 'Auto-rotate is on: the court rotates when we win the serve back.' : 'Auto-rotate is off. Turn it on under More.') + '</p></div>';
  }

  /* ---- roster view ---- */
  function viewRoster() {
    const rows = S.players.map((p) =>
      '<div class="roster-row"><span class="avatar" style="background:' + avatarColor(p) + '">' + esc(initials(p.name)) + '</span>' +
      '<div class="pinfo"><div class="pname">' + esc(playerLabel(p)) + '</div><div class="psub">' + esc(p.pos) + '</div></div>' +
      '<button class="icon-btn" data-a="delPlayer" data-id="' + p.id + '" aria-label="Remove ' + esc(p.name) + '">' + ic('trash') + '</button></div>'
    ).join('');
    return '<div class="card"><h2>Add a player</h2>' +
      '<form data-form="addPlayer"><div class="form-row">' +
      '<input class="field grow" name="name" placeholder="Player name" autocomplete="off" required maxlength="40" aria-label="Player name">' +
      '<input class="field num" name="num" placeholder="#" inputmode="numeric" maxlength="3" aria-label="Jersey number">' +
      '<select class="field" name="pos" aria-label="Position">' + POSITIONS.map((p) => '<option>' + p + '</option>').join('') + '</select>' +
      '<button class="btn green" type="submit">' + ic('plus') + ' Add</button></div></form></div>' +
      '<div class="card"><h2><span>Squad (' + S.players.length + ')</span>' +
      (S.players.length ? '' : '<button class="chip-btn" data-a="sample">' + ic('wand') + ' Load sample team</button>') + '</h2>' +
      (rows || '<div class="empty">No players yet. Add your first one above.</div>') + '</div>';
  }

  /* ---- stats view ---- */
  function viewStats() {
    const setOpts = ['<option value="all">All sets</option>'];
    for (let n = 1; n <= S.set; n++) setOpts.push('<option value="' + n + '"' + (String(U.statSet) === String(n) ? ' selected' : '') + '>Set ' + n + '</option>');
    const stats = compute(U.statSet);
    const rows = S.players.map((p) => ({ p, r: stats[p.id] }));
    const total = sumRecords(rows.map((x) => x.r));
    const head = '<tr><th>Player</th>' + COLS.map((c) => '<th class="g-' + c.g + '" title="' + esc(c.t) + '">' + c.h + '</th>').join('') + '</tr>';
    const body = rows.map((x) => '<tr><td>' + esc(playerLabel(x.p)) + '</td>' +
      COLS.map((c) => {
        const v = c.f(x.r);
        return '<td class="' + (c.h === 'Pts' ? 'strong' : v === null || v === 0 ? 'muted' : '') + '">' + fmtCell(c, v) + '</td>';
      }).join('') + '</tr>').join('');
    const foot = '<tr><td>Team</td>' + COLS.map((c) => '<td>' + fmtCell(c, c.f(total)) + '</td>').join('') + '</tr>';
    const bar = '<div class="stats-bar">' +
      '<div class="seg" role="tablist"><button class="' + (U.statView === 'table' ? 'on' : '') + '" data-a="statView" data-v="table">Table</button>' +
      '<button class="' + (U.statView === 'hits' ? 'on' : '') + '" data-a="statView" data-v="hits">Hit map</button></div>' +
      '<select class="field" data-bind="statSet" aria-label="Set filter">' + setOpts.join('') + '</select><span class="grow"></span>' +
      '<button class="btn green" data-a="exportXlsx">' + ic('download') + ' Export Excel</button>' +
      '<button class="btn alt" data-a="exportCsv">' + ic('download') + ' CSV</button></div>';
    if (U.statView === 'hits') return bar + viewHits();
    return bar +
      (S.players.length
        ? '<div class="table-wrap"><table class="st"><thead>' + head + '</thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>'
        : '<div class="card empty">Add players and log some plays to see stats here.</div>') +
      '<p class="legend">Hold or hover a column heading for its meaning. Hit% = (kills − attack errors) ÷ attempts. Their player is never included in these tables or the export. Excel export has Totals, one sheet per set, Scores, a Landings sheet, and a full Play log.</p>';
  }

  /* ---- hit map ---- */
  function hitFiltered() {
    return S.events.filter((e) => e.land && player(e.pid) &&
      (U.statSet === 'all' || e.set === Number(U.statSet)) &&
      (U.hitPlayer === 'all' || e.pid === U.hitPlayer) &&
      (U.hitResult === 'all' || outcomeOf(e.key) === U.hitResult));
  }

  function zoneOverlay(evs) {
    const X = CRT.X, Y = CRT.Y, L = CRT.L, B = CRT.B, mid = X + L / 2, a = L / 6;
    const counts = {};
    evs.forEach((e) => { const z = zoneOf(e.land); if (z.side !== 'out') { const k = z.side + z.z; counts[k] = (counts[k] || 0) + 1; } });
    const max = Math.max.apply(null, [0].concat(Object.keys(counts).map((k) => counts[k])));
    let out = '';
    ['their', 'our'].forEach((side) => {
      const dir = side === 'their' ? 1 : -1;
      for (let r = 0; r < 3; r++) {
        [['front', ZFRONT, a], ['back', ZBACK, L / 2 - a]].forEach((part) => {
          const w = part[2];
          const x = part[0] === 'front' ? (dir > 0 ? mid : mid - a) : (dir > 0 ? mid + a : X);
          const y = Y + r * B / 3, h = B / 3;
          const z = part[1][side][r];
          const n = counts[side + z] || 0;
          out += '<rect class="zcell ' + side + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' +
            (n ? ' style="fill-opacity:' + (0.14 + 0.6 * n / max).toFixed(2) + '"' : ' style="fill-opacity:0"') + '/>' +
            '<text class="zlab" x="' + (x + (side === 'their' && part[0] === 'front' ? 11 : 6)) + '" y="' + (y + 12) + '">Z' + z + '</text>';
          if (n) {
            out += '<text class="zcount" x="' + (x + w / 2) + '" y="' + (y + h / 2 - 3) + '">' + n + '</text>' +
              '<text class="zpct" x="' + (x + w / 2) + '" y="' + (y + h / 2 + 15) + '">' + Math.round(100 * n / evs.length) + '%</text>';
          }
        });
      }
    });
    return out;
  }

  function viewHits() {
    if (U.hitPlayer !== 'all' && !player(U.hitPlayer)) U.hitPlayer = 'all';
    const any = S.events.some((e) => e.land && player(e.pid));
    const evs = hitFiltered();
    const inCourt = evs.filter((e) => zoneOf(e.land).side !== 'out').length;
    const points = evs.filter((e) => outcomeOf(e.key) === 'pt').length;
    const playerOpts = '<option value="all">All players</option>' +
      S.players.map((p) => '<option value="' + p.id + '"' + (U.hitPlayer === p.id ? ' selected' : '') + '>' + esc(playerLabel(p)) + '</option>').join('');
    const resOpts = [['all', 'All results'], ['pt', 'Points'], ['err', 'Errors'], ['play', 'In play']]
      .map((r) => '<option value="' + r[0] + '"' + (U.hitResult === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('');
    const zones = U.hitMode === 'zones';
    const inner = zones ? zoneOverlay(evs) : evs.map((e) => dotSvg(e, false)).join('');
    return '<div class="card hitmap">' +
      '<div class="hm-filters">' +
        '<select class="field" data-bind="hitPlayer" aria-label="Player">' + playerOpts + '</select>' +
        '<select class="field" data-bind="hitResult" aria-label="Result">' + resOpts + '</select>' +
        '<div class="seg"><button class="' + (zones ? '' : 'on') + '" data-a="hitMode" data-m="dots">Dots</button>' +
        '<button class="' + (zones ? 'on' : '') + '" data-a="hitMode" data-m="zones">Zones</button></div></div>' +
      '<div class="hit-court big">' + courtSvg(inner, 'role="img" aria-label="Hit map"', !zones) + '</div>' +
      '<div class="hit-legend"><span class="lg pt">Point</span><span class="lg err">Error</span><span class="lg play">In play</span>' +
        '<span class="lg-note">Zones are numbered from each team’s own side</span></div>' +
      '<div class="hit-stats">' +
        '<div><b>' + evs.length + '</b><span>Tracked</span></div>' +
        '<div><b>' + (evs.length ? Math.round(100 * inCourt / evs.length) + '%' : '–') + '</b><span>In the court</span></div>' +
        '<div><b>' + (evs.length - inCourt) + '</b><span>Out</span></div>' +
        '<div><b>' + points + '</b><span>Points</span></div></div>' +
      (any ? '' : '<p class="hint">No landing spots yet. On the Game screen, tap the zone where the ball lands, then log the play.</p>') +
      '</div>';
  }

  /* ---- more / settings ---- */
  function toggleRow(key, title, sub) {
    return '<div class="switch-row"><div class="t">' + title + '<small>' + sub + '</small></div>' +
      '<button class="toggle ' + (S[key] ? 'on' : '') + '" role="switch" aria-checked="' + (S[key] ? 'true' : 'false') + '" aria-label="' + title + '" data-a="toggle" data-k="' + key + '"></button></div>';
  }
  function viewMore() {
    return '<div class="card"><h2>Teams</h2>' +
      '<label class="lbl" for="teamName">Your team</label><input id="teamName" class="field" style="width:100%;margin-bottom:12px" data-bind="team" value="' + esc(S.team) + '" maxlength="30">' +
      '<label class="lbl" for="oppName">Opponent</label><input id="oppName" class="field" style="width:100%" data-bind="opp" value="' + esc(S.opp) + '" maxlength="30"></div>' +
      '<div class="card"><h2>Tracking</h2>' +
      toggleRow('askQuality', 'Rate every play', 'Pop up a 1–4 quality rating after each skill action.') +
      toggleRow('trackHits', 'Track where hits land', 'Show the court on the Game screen and save the landing spot with each hit or serve.') +
      toggleRow('autoRotate', 'Auto-rotate on side-out', 'Rotate the court when we win a point while the other team served.') +
      '</div>' +
      '<div class="card"><h2>Match</h2>' +
      toggleRow('autoSet', 'End sets automatically', 'Finish a set at 25 (deciding set 15), win by 2, then start the next one. The match ends when a team wins enough sets.') +
      '<div class="switch-row"><div class="t">Match length<small>Best of ' + S.bestOf + ': first to ' + setsToWin() + ' sets.</small></div>' +
      '<div class="seg">' + [3, 5].map((n) => '<button class="' + (S.bestOf === n ? 'on' : '') + '" data-a="bestOf" data-n="' + n + '">Best of ' + n + '</button>').join('') + '</div></div>' +
      '</div>' +
      '<div class="card"><h2>Your data</h2><p class="hint" style="text-align:left;margin:0 0 12px">Everything is stored on this device. Save a backup before clearing your browser or switching devices.</p>' +
      '<div class="btn-row"><button class="btn alt" data-a="backup">' + ic('save') + ' Save backup</button>' +
      '<button class="btn alt" data-a="restore">' + ic('upload') + ' Restore backup</button></div></div>' +
      '<div class="card"><h2>Start fresh</h2><div class="btn-row">' +
      '<button class="btn danger" data-a="newMatch">' + ic('rotate') + ' New match (keep roster)</button>' +
      '<button class="btn danger" data-a="resetAll">' + ic('trash') + ' Erase everything</button></div></div>' +
      '<p class="hint">Dimed Stats · works offline once loaded</p>';
  }

  const VIEWS = { game: viewGame, court: viewCourt, roster: viewRoster, stats: viewStats, more: viewMore };

  /* ------------------------------------------------------------------ export */
  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const fileStem = () => (S.team.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'team') + '-' + new Date().toISOString().slice(0, 10);

  function statsSheet(name, setFilter) {
    const stats = compute(setFilter);
    const rows = [['#', 'Player', 'Pos'].concat(COLS.map((c) => c.h))];
    S.players.forEach((p) => {
      rows.push([p.num || null, p.name, p.pos].concat(COLS.map((c) => exportCell(c, c.f(stats[p.id])))));
    });
    const total = sumRecords(S.players.map((p) => stats[p.id]));
    rows.push([null, 'Team', null].concat(COLS.map((c) => exportCell(c, c.f(total)))));
    const cols = [{ w: 6 }, { w: 22 }, { w: 7 }].concat(COLS.map((c) => ({ w: c.h === 'Avg Q' ? 9 : 8, s: c.fmt || 'text' })));
    return { name, rows, cols };
  }

  function buildSheets() {
    const sheets = [statsSheet('Totals', 'all')];
    const used = {};
    S.events.forEach((e) => { used[e.set] = true; });
    for (let n = 1; n <= S.set; n++) if (used[n] || n === S.set) sheets.push(statsSheet('Set ' + n, n));
    const scores = [['Set', S.team, S.opp]];
    for (let n = 1; n <= S.set; n++) { const s = scoreFor(n); scores.push([n, s.us, s.them]); }
    sheets.push({ name: 'Scores', rows: scores, cols: [{ w: 6 }, { w: 20 }, { w: 20 }] });
    const log = [['Set', 'Time', '#', 'Player', 'Pos', 'Action', 'Category', 'Quality (1-4)', 'Quality', 'Point for', 'Landed', 'Land X (m)', 'Land Y (m)']];
    S.events.forEach((e) => {
      if (e.pid === 'opp' || e.pid === 'manual') return;   // never export their player
      const d = STATS[e.key];
      if (!d) return;
      const side = scoringSide(e);
      log.push([e.set, new Date(e.ts).toLocaleString(), e.pnum || null, e.pn, e.ppos, d.label,
        { pts: 'Point', err: 'Error', skill: 'Skill', trans: 'Transition' }[d.g], e.q || null, e.q ? RATING_NAME[e.q] : null,
        side ? (side === 'us' ? S.team : S.opp) : null,
        e.land ? zoneLabel(e.land) : null, e.land && e.land.z === undefined ? Math.round(e.land.u * 18 * 10) / 10 : null, e.land && e.land.z === undefined ? Math.round(e.land.v * 9 * 10) / 10 : null]);
    });
    sheets.push({ name: 'Play log', rows: log, cols: [{ w: 6 }, { w: 22 }, { w: 6 }, { w: 22 }, { w: 7 }, { w: 20 }, { w: 12 }, { w: 13 }, { w: 10 }, { w: 18 }, { w: 11 }, { w: 11 }, { w: 11 }] });

    // Where hits landed, per player: counts in each zone of the other team's court.
    const tracked = S.events.filter((e) => e.land && player(e.pid));
    if (tracked.length) {
      const rows = [['#', 'Player', 'Tracked', 'Their Z1', 'Their Z2', 'Their Z3', 'Their Z4', 'Their Z5', 'Their Z6', 'Our side', 'Out']];
      const line = (p, list) => {
        const c = { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, t6: 0, our: 0, out: 0 };
        list.forEach((e) => { const z = zoneOf(e.land); if (z.side === 'their') c['t' + z.z]++; else c[z.side]++; });
        return [p ? (p.num || null) : null, p ? p.name : 'Team', list.length, c.t1, c.t2, c.t3, c.t4, c.t5, c.t6, c.our, c.out];
      };
      S.players.forEach((p) => { const list = tracked.filter((e) => e.pid === p.id); if (list.length) rows.push(line(p, list)); });
      rows.push(line(null, tracked));
      sheets.push({ name: 'Landings', rows, cols: [{ w: 6 }, { w: 22 }, { w: 9 }, { w: 10 }, { w: 10 }, { w: 10 }, { w: 10 }, { w: 10 }, { w: 10 }, { w: 9 }, { w: 6 }] });
    }
    return sheets;
  }

  function exportXlsx() {
    if (!S.players.length) { toast('Add players first'); return; }
    try {
      download(window.DimedXLSX.build(buildSheets()), fileStem() + '.xlsx');
      toast('Excel file saved');
    } catch (err) { console.error(err); toast('Could not build the Excel file'); }
  }

  function exportCsv() {
    if (!S.players.length) { toast('Add players first'); return; }
    const sheet = statsSheet('Totals', U.statSet);
    const q = (v) => { if (v === null || v === undefined) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + sheet.rows.map((r) => r.map(q).join(',')).join('\r\n');
    download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileStem() + '.csv');
    toast('CSV saved');
  }

  function backup() {
    download(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }), 'dimed-backup-' + new Date().toISOString().slice(0, 10) + '.json');
    toast('Backup saved');
  }

  /* ------------------------------------------------------------------ actions */
  const A = {
    tab(d) { S.tab = d.tab; U.oppMode = false; save(); render(); window.scrollTo(0, 0); },
    pick(d) { if (U.oppMode) { toast('Tap an action for their player, or cancel'); return; } S.selId = S.selId === d.id ? null : d.id; save(); render(); },
    unpick() { S.selId = null; save(); render(); },
    who(d) {
      const key = U.whoKey;
      closeModal(false);
      if (key && player(d.id)) tapStat(key, d.id);
    },
    opp() { U.oppMode = !U.oppMode; render(); },
    stat(d) { tapStat(d.key, d.id || S.selId); },
    undo() { undo(); },
    adj(d) {
      const side = d.side, delta = Number(d.delta || d.d);
      if (delta > 0) {
        if (matchLocked()) return;
        const scorer = pushEvent('manual', '_pt', null, side);
        if (scorer) toast('+1 ' + (scorer === 'us' ? S.team : S.opp));
      } else {
        if (scoreFor(S.set)[side] <= 0) return;
        const a = S.adj[S.set] || (S.adj[S.set] = { us: 0, them: 0 });
        a[side]--; save(); render();
      }
    },
    hitZone(d) {
      const l = zoneLand(Number(d.z));
      const w = U.wait && S.events.find((ev) => ev.id === U.wait.id);
      if (w) {
        w.land = l;
        clearWait();
        save(); render();
        toast(w.pn + ': ' + STATS[w.key].label + ' · ' + zoneLabel(l));
      } else if (U.land && U.land.z === l.z) {
        U.land = null;   // tapping the chosen zone again clears it
        updateHitCard();
      } else {
        U.land = l;
        updateHitCard();
      }
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { /* ignore */ } }
    },
    hitSkip() { clearWait(); updateHitCard(); },
    hitClear() { U.land = null; updateHitCard(); },
    statView(d) { U.statView = d.v === 'hits' ? 'hits' : 'table'; render(); },
    hitMode(d) { U.hitMode = d.m === 'zones' ? 'zones' : 'dots'; render(); },
    toggleServe() { S.serving = S.serving === 'us' ? 'them' : 'us'; save(); render(); },
    undoSetPoint() { closeModal(false); undo(); },
    bestOf(d) { S.bestOf = Number(d.n) === 3 ? 3 : 5; save(); render(); },
    endSet() {
      if (matchLocked()) return;
      const sc = scoreFor(S.set);
      ask('Start set ' + (S.set + 1) + '?', 'Set ' + S.set + ' is saved as ' + sc.us + '–' + sc.them + '. The scoreboard resets for the new set.', 'Start next set').then((ok) => {
        if (!ok) return;
        S.set++; clearForNewSet(); save(); render(); toast('Set ' + S.set + ' · court cleared, pick the lineup');
      });
    },
    backdrop(d, e, el) { if (e.target === el) closeModal(true); },
    askYes() { const r = U.resolver; U.resolver = null; closeModal(false); if (r) r(true); },
    askNo() { closeModal(true); },
    rate(d) {
      const pend = U.pending;
      closeModal(false);
      if (!pend) return;
      const q = Number(d.q) || null;
      const p = player(pend.pid);
      if (!p) return;
      const scorer = pushEvent(pend.pid, pend.key, q, null, takeLand(pend.key, false));
      toast(p.name + ': ' + STATS[pend.key].label + (q ? ' · ' + RATING_NAME[q] : '') + (scorer ? ' · +1 ' + (scorer === 'us' ? S.team : S.opp) : ''));
    },
    zone(d) {
      const i = Number(d.i);
      U.zoneIdx = i;
      const cur = S.rotation[i] && player(S.rotation[i]);
      const onCourt = {};
      S.rotation.forEach((id) => { if (id) onCourt[id] = true; });
      const avail = S.players.filter((p) => !onCourt[p.id]);
      if (!cur && !avail.length) { toast(S.players.length ? 'Everyone is already on court' : 'Add players in Roster first'); return; }
      openModal('<h3>' + (cur ? 'Sub ' + esc(cur.name) + ' out' : 'Zone ' + ZONE_NUM[i]) + '</h3><p class="sub">' + (cur ? 'Zone ' + ZONE_NUM[i] + '. Pick who comes in from the bench, or take them off. Stats stay with each player.' : 'Choose who plays here.') + '</p>' +
        '<div class="pick-list">' +
        avail.map((p) => '<button class="pick" data-a="assign" data-id="' + p.id + '"><span class="avatar" style="background:' + avatarColor(p) + '">' + esc(initials(p.name)) + '</span>' +
          '<span class="pinfo"><span class="pname">' + esc(playerLabel(p)) + '</span><span class="psub">' + esc(p.pos) + '</span></span></button>').join('') +
        (cur ? '<button class="pick remove" data-a="unassign">' + ic('trash') + ' Take ' + esc(cur.name) + ' off the court</button>' : '') +
        '</div>');
    },
    assign(d) {
      const out = S.rotation[U.zoneIdx] && player(S.rotation[U.zoneIdx]), p = player(d.id);
      putInZone(U.zoneIdx, d.id); save(); closeModal(false); render();
      if (out && p) toast(p.name + ' in for ' + out.name);
    },
    unassign() { S.rotation[U.zoneIdx] = null; save(); closeModal(false); render(); },
    // Sub button on the Game screen: a court player picks who comes in; a bench player picks a zone.
    sub(d) {
      const p = player(d.id);
      if (!p) return;
      const i = S.rotation.indexOf(p.id);
      if (i >= 0) { A.zone({ i }); return; }
      const rows = [1, 2, 3, 4, 5, 6].map((z) => {
        const idx = ZONE_NUM.indexOf(z), cur = S.rotation[idx] && player(S.rotation[idx]);
        return '<button class="pick" data-a="subTo" data-i="' + idx + '"><span class="avatar zone-av' + (cur ? '' : ' empty') + '"' + (cur ? ' style="background:' + avatarColor(cur) + '"' : '') + '>Z' + z + '</span>' +
          '<span class="pinfo"><span class="pname">' + (cur ? 'For ' + esc(playerLabel(cur)) : 'Empty spot') + '</span><span class="psub">' + (cur ? esc(cur.pos) + ' · zone ' + z : 'Zone ' + z) + '</span></span></button>';
      }).join('');
      U.subId = p.id;
      openModal('<h3>Sub ' + esc(p.name) + ' in</h3><p class="sub">Choose the zone they take. Stats stay with each player.</p><div class="pick-list">' + rows + '</div>');
    },
    subTo(d) { U.zoneIdx = Number(d.i); const id = U.subId; U.subId = null; if (player(id)) A.assign({ id }); },
    reuseLineup() {
      const l = prevLineup();
      if (!l) return;
      S.rotation = l; closeModal(false); save(); render(); toast('Set ' + S.set + ' lineup set');
    },
    pickLineup() { closeModal(false); A.tab({ tab: 'court' }); },
    rotate() {
      if (!S.rotation.some(Boolean)) { toast('Put players on the court first'); return; }
      rotateTeam(); save(); render(); toast('Rotated clockwise');
    },
    unrotate() { unrotateTeam(); save(); render(); toast('Rotated back'); },
    autofill() {
      S.rotation = [null, null, null, null, null, null];
      // fill Z1..Z6 in numeric order
      S.players.slice(0, 6).forEach((p, n) => { S.rotation[ZONE_NUM.indexOf(n + 1)] = p.id; });
      save(); render(); toast('First six players placed');
    },
    clearCourt() { S.rotation = [null, null, null, null, null, null]; save(); render(); },
    delPlayer(d) {
      const p = player(d.id);
      if (!p) return;
      ask('Remove ' + p.name + '?', 'Their logged plays stay in the score and the play log, but they will no longer appear in the stat tables.', 'Remove player', true).then((ok) => {
        if (!ok) return;
        S.players = S.players.filter((x) => x.id !== d.id);
        S.rotation = S.rotation.map((id) => (id === d.id ? null : id));
        if (S.lastLineup) S.lastLineup = S.lastLineup.map((id) => (id === d.id ? null : id));
        if (S.selId === d.id) S.selId = null;
        save(); render(); toast(p.name + ' removed');
      });
    },
    sample() {
      const names = [['Alex Rivera', '1', 'S'], ['Jamie Park', '7', 'OH'], ['Morgan Lee', '11', 'MB'], ['Casey Tran', '4', 'L'],
        ['Riley Chen', '9', 'OH'], ['Taylor Brooks', '14', 'MB'], ['Jordan Ellis', '3', 'OPP'], ['Sam Ortiz', '12', 'DS']];
      names.forEach((n) => S.players.push({ id: uid(), name: n[0], num: n[1], pos: n[2] }));
      save(); render(); toast('Sample team loaded');
    },
    toggle(d) { S[d.k] = !S[d.k]; save(); render(); },
    exportXlsx, exportCsv, backup,
    restore() { $('#restoreFile').click(); },
    newMatch() {
      ask('Start a new match?', 'This clears all logged plays and scores but keeps your roster. Export first if you want a copy.', 'Clear match', true).then((ok) => {
        if (!ok) return;
        S.events = []; S.adj = {}; S.set = 1; S.serving = 'us'; S.matchOver = null; S.subs = []; S.starts = {}; clearForNewSet(); U.statSet = 'all'; U.oppMode = false; U.land = null; clearWait();
        save(); render(); toast('New match ready');
      });
    },
    resetAll() {
      ask('Erase everything?', 'Roster, plays, and settings will be deleted from this device. This cannot be undone.', 'Erase everything', true).then((ok) => {
        if (!ok) return;
        S = fresh(); U.statSet = 'all'; U.oppMode = false; U.land = null; clearWait(); save(); render(); toast('All data erased');
      });
    },
    install() {
      const e = U.installEvt;
      if (!e) return;
      e.prompt();
      e.userChoice.finally(() => { U.installEvt = null; renderAppbar(); });
    }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el) return;
    const fn = A[el.dataset.a];
    if (fn) fn(el.dataset, e, el);
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    if (form.dataset.form === 'addPlayer') {
      const f = new FormData(form);
      const name = String(f.get('name') || '').trim();
      if (!name) return;
      S.players.push({ id: uid(), name, num: String(f.get('num') || '').trim(), pos: String(f.get('pos') || 'OH') });
      save(); render(); toast(name + ' added');
      const nameField = $('input[name="name"]');
      if (nameField) nameField.focus();
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.dataset || !t.dataset.bind) return;
    if (t.dataset.bind === 'statSet') { U.statSet = t.value; render(); return; }
    if (t.dataset.bind === 'hitPlayer') { U.hitPlayer = t.value; render(); return; }
    if (t.dataset.bind === 'hitResult') { U.hitResult = t.value; render(); return; }
    if (t.dataset.bind === 'team' || t.dataset.bind === 'opp') {
      S[t.dataset.bind] = t.value.trim() || (t.dataset.bind === 'team' ? 'Our team' : 'Opponent');
      save(); render();
    }
  });

  document.addEventListener('keydown', (e) => {
    const zb = e.target.closest && e.target.closest('.zbtn');
    if (zb && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); A.hitZone(zb.dataset); return; }
    if (U.pending && !$('#modal').hidden) {
      if (e.key >= '1' && e.key <= '4') { e.preventDefault(); A.rate({ q: e.key }); }
      else if (e.key === 'Escape') closeModal(true);
    } else if (e.key === 'Escape' && !$('#modal').hidden) closeModal(true);
  });

  $('#restoreFile').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.players) || !Array.isArray(data.events)) throw new Error('bad');
        ask('Restore this backup?', 'It replaces the roster and plays currently on this device.', 'Restore', true).then((ok) => {
          if (!ok) return;
          S = Object.assign(fresh(), data); save(); render(); toast('Backup restored');
        });
      } catch (err) { toast('That file is not a Dimed backup'); }
    };
    reader.readAsText(file);
  });

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); U.installEvt = e; renderAppbar(); });
  window.addEventListener('appinstalled', () => { U.installEvt = null; renderAppbar(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable */ }); });
  }

  // Expose a tiny surface for automated tests.
  window.__dimed = { get state() { return S; }, get ui() { return U; }, scoreFor, compute, buildSheets, zoneOf, zoneLabel, zoneLand };

  render();
})();
