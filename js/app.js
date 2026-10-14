import { SUBJECT, WATCH_REQUIRED } from './config.js';
import { SUBJECTS, QUIZ } from './data.js';
import { backend, isDemo } from './backend.js';

const S = SUBJECTS[SUBJECT];
const CREATOR_IMG = 'img/creator.jpg';
const MODS = S.modules;
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDur = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const fmtSize = b => b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB';
const fmtDate = d => d ? new Date(d).toLocaleString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';
const ICON = {
  play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>',
  lock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  key: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" stroke-width="2"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/></svg>',
};

// ------------------------------------------------------------ local state
const LS = k => `hub-${SUBJECT}-${k}`;
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(LS(k))) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(LS(k), JSON.stringify(v)); } catch { } };
let profile = load('profile', null);           // {name, kelas}
let progress = load('progress', {});           // {code: {watched, best, attempts, last}}
let history = load('history', []);             // [{code, score, total, at}]
let videos = {};                               // {code: {url, ...}}
let isAdmin = false;
const prog = c => progress[c] || (progress[c] = { watched: 0, best: null, attempts: 0 });

// Pengesahan dua klik (dialog confirm() tidak berfungsi dalam sesetengah iframe)
function armed(btn, label) {
  if (btn.dataset.armed === '1') return true;
  btn.dataset.armed = '1'; const old = btn.textContent; btn.textContent = label;
  setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ''; btn.textContent = old; } }, 4000);
  return false;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
function waveBars(n, cls = '') { return `<div class="wave ${cls}" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="height:${25 + Math.abs(Math.sin(i * 1.7)) * 75}%;animation-delay:${-(i * 0.13) % 1.6}s"></i>`).join('')}</div>`; }
function modBars(seed) { return `<div class="mod-bars" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="height:${20 + Math.abs(Math.sin(i * 0.9 + seed)) * 80}%"></i>`).join('')}</div>`; }
function status(code) {
  const p = prog(code); const has = !!videos[code];
  if (p.best != null) return `<span class="chip ok">Kuiz: ${p.best}/${QUIZ[code].length}</span>`;
  if (p.watched >= WATCH_REQUIRED) return '<span class="chip info">Kuiz dibuka</span>';
  if (p.watched > 0.02) return `<span class="chip warn">Ditonton ${Math.round(p.watched * 100)}%</span>`;
  return has ? '<span class="chip">Belum mula</span>' : '<span class="chip">Video akan datang</span>';
}

// ------------------------------------------------------------ router
const routes = { home: viewHome, modul: viewModule, markah: viewScores, admin: viewAdmin };
async function route() {
  const [, r = '', arg] = location.hash.split('/');
  const name = routes[r] ? r : 'home';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === name || (name === 'modul' && a.dataset.r === 'home')));
  if (window._cleanup) { window._cleanup(); window._cleanup = null; }
  await routes[name](arg);
  app.focus({ preventScroll: true }); window.scrollTo(0, 0);
}

// ------------------------------------------------------------ HOME
function profileForm(inHero) {
  return `<form class="profile" id="profileForm">
    <div><label class="lbl" for="pName">Nama penuh</label><input class="input" id="pName" required maxlength="60" placeholder="cth. Nur Aisyah binti Ahmad" value="${esc(profile?.name)}"></div>
    <div><label class="lbl" for="pKelas">Kelas</label><input class="input" id="pKelas" required maxlength="30" placeholder="cth. 4 Seni" value="${esc(profile?.kelas)}"></div>
    <button class="btn ${inHero ? 'btn-light' : 'btn-primary'}" type="submit">${profile ? 'Simpan' : 'Mula belajar'}</button>
  </form>`;
}
function bindProfile(after) {
  const f = $('#profileForm'); if (!f) return;
  f.addEventListener('submit', e => { e.preventDefault(); const name = $('#pName').value.trim(), kelas = $('#pKelas').value.trim(); if (!name || !kelas) return;
    profile = { name, kelas }; save('profile', profile); toast(`Selamat datang, ${name}!`); after && after(); });
}
async function viewHome() {
  const done = MODS.filter(m => prog(m.code).best != null).length;
  const totalScore = MODS.reduce((a, m) => a + (prog(m.code).best || 0), 0);
  const totalQ = MODS.reduce((a, m) => a + QUIZ[m.code].length, 0);
  const pct = Math.round(done / MODS.length * 100);
  app.innerHTML = `
  <section class="hero">
    <div class="hero-grid">
      <div>
        <div class="hero-id">
          <div class="creator-photo"><img src="${CREATOR_IMG}" alt="Cikgu Dzurri" width="132" height="152"></div>
          <div class="hero-name">
            <div class="eyebrow">Pendidikan Seni Muzik · Tingkatan 4</div>
            <h1>${esc(S.hubTitle)}</h1>
            <div class="by">Dicipta oleh <b>Cikgu Dzurri</b><span class="copy">copyright@dzurrihensem</span></div>
          </div>
        </div>
        <p>Tonton setiap video, kemudian jawab kuiz untuk menguji kefahaman anda. Kuiz akan dibuka selepas anda menonton sekurang-kurangnya ${Math.round(WATCH_REQUIRED * 100)}% video.</p>
        ${waveBars(48)}
      </div>
      <div class="stat-panel">
        ${profile ? `
          <div class="who">${esc(profile.name)}<small>Kelas ${esc(profile.kelas)} · <a href="#" id="editProfile">Tukar</a></small></div>
          <div class="stats">
            <div><b>${done}/${MODS.length}</b><span>Modul selesai</span></div>
            <div><b>${totalScore}/${totalQ}</b><span>Jumlah markah</span></div>
            <div><b>${pct}%</b><span>Kemajuan</span></div>
          </div>
          <div class="bar"><i style="width:${pct}%"></i></div>` : `
          <div class="who">Daftar dahulu<small>Masukkan nama dan kelas supaya markah kuiz anda dapat direkodkan.</small></div>
          <div style="margin-top:14px">${profileForm(true)}</div>`}
      </div>
    </div>
  </section>
  <div class="section-head"><div><div class="eyebrow">Siri video</div><h2>Modul ${esc(S.name)}</h2></div><span class="muted">${MODS.length} modul · ${MODS.reduce((a, m) => a + QUIZ[m.code].length, 0)} soalan kuiz</span></div>
  <div class="grid">
    ${MODS.map((m, i) => `
    <a class="card mod" href="#/modul/${m.code}">
      <div class="mod-top"><span class="mod-code">${m.code}</span><span class="mod-play">${ICON.play}</span>${modBars(i * 2.3)}</div>
      <div class="mod-body">
        <h3>${esc(m.title)}</h3>
        <p>${esc(m.desc)}</p>
        <div class="mod-meta"><span class="chip">${fmtDur(m.dur)} min</span><span class="chip">${QUIZ[m.code].length} soalan</span>${status(m.code)}</div>
      </div>
    </a>`).join('')}
  </div>`;
  bindProfile(viewHome);
  const ed = $('#editProfile'); if (ed) ed.addEventListener('click', e => { e.preventDefault(); const p = profile; profile = null; viewHome().then(() => { profile = p; $('#pName').value = p.name; $('#pKelas').value = p.kelas; }); });
}

// ------------------------------------------------------------ MODULE
async function viewModule(code) {
  const idx = MODS.findIndex(m => m.code === code); if (idx < 0) { location.hash = '#/'; return; }
  const m = MODS[idx]; const p = prog(code); const v = videos[code];
  const next = MODS[idx + 1];
  app.innerHTML = `
  <div class="crumb"><a href="#/">Utama</a> / ${esc(S.name)} / ${m.code}</div>
  <div class="mod-layout">
    <div>
      <div class="card player">
        ${v ? `<video id="vid" controls playsinline preload="metadata" src="${esc(v.url)}"></video>` :
          `<div class="player-empty"><strong style="font-size:18px;color:var(--primary)">Video belum dimuat naik</strong><span>Admin akan memuat naik video ${m.code} tidak lama lagi.</span></div>`}
        <div class="player-info">
          <span class="eyebrow">${m.code} · ${esc(S.name)}</span>
          <h1>${esc(m.title)}</h1>
          <p class="muted" style="margin:0">${esc(m.desc)}</p>
          <div class="watch-row"><span>Tontonan</span><div class="bar"><i id="watchBar" style="width:${Math.round(p.watched * 100)}%"></i></div><span id="watchPct" class="mono">${Math.round(p.watched * 100)}%</span></div>
        </div>
      </div>
      <section class="card quiz" id="quiz"></section>
    </div>
    <aside class="side" style="display:flex;flex-direction:column;gap:16px">
      <div class="card pad">
        <h3>Langkah pembelajaran</h3>
        <ol class="steps" id="steps"></ol>
      </div>
      <div class="card pad">
        <h3>Semua modul</h3>
        <div class="mini-list">${MODS.map(x => `<a href="#/modul/${x.code}" class="${x.code === code ? 'cur' : ''}"><span class="mono">${x.code}</span><span>${esc(x.title)}</span></a>`).join('')}</div>
      </div>
    </aside>
  </div>`;

  const renderSteps = () => {
    const w = p.watched >= WATCH_REQUIRED, q = p.best != null;
    $('#steps').innerHTML = [
      ['Tonton video', `Sekurang-kurangnya ${Math.round(WATCH_REQUIRED * 100)}%`, w, !w],
      ['Jawab kuiz', `${QUIZ[code].length} soalan aneka pilihan`, q, w && !q],
      ['Semak markah', q ? `Markah terbaik: ${p.best}/${QUIZ[code].length}` : 'Lihat jawapan dan penerangan', q, false],
    ].map(([t, d, done, now], i) => `<li class="${done ? 'done' : now ? 'now' : ''}"><span class="n">${done ? '✓' : i + 1}</span><span><b>${t}</b><br><span class="muted" style="font-size:13px">${d}</span></span></li>`).join('');
  };
  renderSteps();

  // watch tracking: count only seconds actually played (skipping does not count)
  const vid = $('#vid');
  if (vid) {
    const seen = new Set(load(`seen-${code}`, []));
    let lastT = 0;
    const update = () => {
      const d = vid.duration || m.dur; const t = Math.floor(vid.currentTime);
      if (!vid.seeking && !vid.paused && Math.abs(vid.currentTime - lastT) < 2) seen.add(t);
      lastT = vid.currentTime;
      const w = Math.min(1, seen.size / Math.max(1, Math.floor(d)));
      if (w > p.watched) {
        const wasLocked = p.watched < WATCH_REQUIRED; p.watched = w; save('progress', progress); save(`seen-${code}`, [...seen]);
        $('#watchBar').style.width = Math.round(w * 100) + '%'; $('#watchPct').textContent = Math.round(w * 100) + '%';
        if (wasLocked && w >= WATCH_REQUIRED) { renderSteps(); renderQuiz(); toast('Kuiz telah dibuka!'); }
      }
    };
    vid.addEventListener('timeupdate', update);
    vid.addEventListener('seeked', () => { lastT = vid.currentTime; });
    vid.addEventListener('ended', () => { update(); if (p.watched < WATCH_REQUIRED) toast(`Anda telah menonton ${Math.round(p.watched * 100)}%. Tonton bahagian yang dilangkau untuk membuka kuiz.`); });
    window._cleanup = () => { save(`seen-${code}`, [...seen]); vid.pause(); };
  }

  // ---------------- quiz
  let state = null;
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function newAttempt() {
    state = { i: 0, picks: [], qs: QUIZ[code].map(q => { const order = shuffle(q.o.map((_, k) => k)); return { ...q, order }; }) };
  }
  function renderQuiz() {
    const el = $('#quiz'); const n = QUIZ[code].length;
    const head = `<div class="quiz-head"><div><span class="eyebrow">Penilaian</span><h2>Kuiz ${m.code}</h2></div><span class="chip">${n} soalan${p.best != null ? ` · Terbaik ${p.best}/${n}` : ''}</span></div>`;
    if (p.watched < WATCH_REQUIRED) {
      el.innerHTML = head + `<div class="locked"><div class="lock-ic">${ICON.lock}</div><b style="color:var(--ink)">Kuiz dikunci</b><span>Tonton sekurang-kurangnya ${Math.round(WATCH_REQUIRED * 100)}% video untuk membuka kuiz. Kemajuan semasa: ${Math.round(p.watched * 100)}%.</span></div>`;
      return;
    }
    if (!profile) {
      el.innerHTML = head + `<div class="q-wrap"><p style="margin-top:0"><b>Daftar dahulu.</b> Masukkan nama dan kelas supaya markah anda direkodkan.</p>${profileForm(false)}</div>`;
      bindProfile(renderQuiz); return;
    }
    if (!state) {
      el.innerHTML = head + `<div class="locked"><div class="lock-ic" style="color:var(--ok)">✓</div><b style="color:var(--ink)">Kuiz sedia untuk dijawab</b><span>${n} soalan aneka pilihan. Pilih satu jawapan bagi setiap soalan.</span><button class="btn btn-primary" id="startQ">${p.attempts ? 'Cuba semula' : 'Mula kuiz'}</button></div>`;
      $('#startQ').onclick = () => { newAttempt(); renderQuiz(); };
      return;
    }
    if (state.done) return renderResult(el, head);
    const q = state.qs[state.i]; const pick = state.picks[state.i];
    el.innerHTML = head + `<div class="q-wrap">
      <div class="q-progress">${state.qs.map((_, k) => `<i class="${k < state.i ? 'done' : k === state.i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="q-num">Soalan ${state.i + 1} daripada ${n}</div>
      <div class="q-text">${esc(q.q)}</div>
      <div class="opts">${q.order.map((oi, k) => `<button class="opt ${pick === oi ? 'sel' : ''}" data-oi="${oi}"><span class="k">${'ABCD'[k]}</span><span>${esc(q.o[oi])}</span></button>`).join('')}</div>
      <div class="q-actions">
        <button class="btn btn-ghost" id="prevQ" ${state.i === 0 ? 'disabled' : ''}>Sebelumnya</button>
        <button class="btn btn-primary" id="nextQ" ${pick == null ? 'disabled' : ''}>${state.i === n - 1 ? 'Hantar jawapan' : 'Seterusnya'}</button>
      </div></div>`;
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => { state.picks[state.i] = +b.dataset.oi; renderQuiz(); });
    $('#prevQ').onclick = () => { state.i--; renderQuiz(); };
    $('#nextQ').onclick = async () => {
      if (state.i < n - 1) { state.i++; renderQuiz(); return; }
      const score = state.qs.reduce((a, q, k) => a + (state.picks[k] === q.a ? 1 : 0), 0);
      state.done = true; state.score = score;
      p.attempts++; p.best = Math.max(p.best ?? 0, score); p.last = score; save('progress', progress);
      history.unshift({ code, score, total: n, at: Date.now() }); save('history', history.slice(0, 200));
      renderSteps(); renderQuiz();
      try { await backend.submitScore({ name: profile.name, kelas: profile.kelas, code, score, total: n }); toast('Markah anda telah direkodkan.'); }
      catch (e) { console.error(e); toast('Markah disimpan dalam peranti ini, tetapi gagal dihantar ke pelayan.'); }
    };
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function renderResult(el, head) {
    const n = state.qs.length, sc = state.score, pc = Math.round(sc / n * 100);
    const [label, col, msg] = pc >= 80 ? ['Cemerlang', 'var(--ok)', 'Tahniah! Anda memahami modul ini dengan sangat baik.'] : pc >= 60 ? ['Baik', 'var(--primary-2)', 'Bagus! Semak semula soalan yang salah untuk kefahaman penuh.'] : pc >= 40 ? ['Memuaskan', 'var(--warn)', 'Tonton semula bahagian yang berkaitan dan cuba lagi.'] : ['Cuba lagi', 'var(--bad)', 'Tonton semula video dengan teliti, kemudian cuba kuiz sekali lagi.'];
    el.innerHTML = head + `<div class="result">
      <div class="result-top">
        <div class="score-ring" style="--p:${pc};--c:${col}"><div><b>${sc}/${n}</b><span>${pc}%</span></div></div>
        <div style="flex:1;min-width:220px"><span class="chip" style="color:${col}">${label}</span><h3 style="margin-top:8px">${esc(profile.name)}, markah anda ${sc}/${n}</h3><p class="muted" style="margin:0">${msg}</p>
          <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-ghost" id="retry">Cuba semula</button>${next ? `<a class="btn btn-primary" href="#/modul/${next.code}">Modul seterusnya: ${next.code}</a>` : '<a class="btn btn-primary" href="#/markah">Lihat semua markah</a>'}</div></div>
      </div>
      <h3 style="font-size:15px;margin-top:28px">Semakan jawapan</h3>
      <div class="review">${state.qs.map((q, k) => { const ok = state.picks[k] === q.a; return `<div class="rv ${ok ? 'ok' : 'bad'}"><div class="t">${k + 1}. ${esc(q.q)}</div>
        <div class="a">${ok ? '<span style="color:var(--ok);font-weight:700">Betul</span>' : `<span style="color:var(--bad);font-weight:700">Salah</span> · Jawapan anda: ${esc(q.o[state.picks[k]])}`} · Jawapan betul: <b>${esc(q.o[q.a])}</b></div>
        <div class="e">${esc(q.e)}</div></div>`; }).join('')}</div></div>`;
    $('#retry').onclick = () => { newAttempt(); renderQuiz(); };
  }
  renderQuiz();
}

// ------------------------------------------------------------ MY SCORES
async function viewScores() {
  const rows = MODS.map(m => ({ m, p: prog(m.code) }));
  app.innerHTML = `
  <div class="section-head" style="margin-top:0"><div><div class="eyebrow">Rekod peribadi</div><h2>Markah Saya</h2></div>${profile ? `<span class="chip">${esc(profile.name)} · ${esc(profile.kelas)}</span>` : ''}</div>
  ${!profile ? `<div class="card pad" style="margin-bottom:16px"><p style="margin-top:0"><b>Anda belum mendaftar.</b> Masukkan nama dan kelas.</p>${profileForm(false)}</div>` : ''}
  <div class="card"><div class="tbl-wrap"><table class="tbl stack">
    <thead><tr><th>Modul</th><th>Tajuk</th><th>Tontonan</th><th class="num">Percubaan</th><th class="num">Markah terbaik</th></tr></thead>
    <tbody>${rows.map(({ m, p }) => `<tr><td class="mono">${m.code}</td><td><a href="#/modul/${m.code}">${esc(m.title)}</a></td>
      <td style="min-width:140px"><div class="bar"><i style="width:${Math.round(p.watched * 100)}%"></i></div><span class="muted" style="font-size:12px">${Math.round(p.watched * 100)}%</span></td>
      <td class="num">${p.attempts || 0}</td><td class="num">${p.best != null ? `<b>${p.best}/${QUIZ[m.code].length}</b>` : '<span class="muted">–</span>'}</td></tr>`).join('')}</tbody>
  </table></div></div>
  <div class="section-head"><h2>Sejarah percubaan</h2></div>
  <div class="card">${history.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tarikh</th><th>Modul</th><th class="num">Markah</th></tr></thead><tbody>
    ${history.slice(0, 50).map(h => `<tr><td>${fmtDate(h.at)}</td><td class="mono">${h.code}</td><td class="num">${h.score}/${h.total}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Belum ada percubaan kuiz.</div>'}</div>`;
  bindProfile(viewScores);
}

// ------------------------------------------------------------ ADMIN
let adminTab = 'video';
async function viewAdmin() {
  if (!isAdmin) {
    app.innerHTML = `<div class="card pad login">
      <div class="login-ic">${ICON.key}</div>
      <h2 style="font-size:20px">Log masuk Admin</h2>
      <p class="muted" style="margin:6px 0 18px">Untuk guru sahaja: muat naik video dan semak markah murid.</p>
      <form id="loginForm"><label class="lbl" for="pw">Kata laluan</label><input class="input" id="pw" type="password" autocomplete="current-password" required>
      <div class="err" id="loginErr"></div><button class="btn btn-primary" style="width:100%;margin-top:6px" type="submit" id="loginBtn">Log masuk</button></form></div>`;
    $('#loginForm').addEventListener('submit', async e => {
      e.preventDefault(); const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Menyemak…'; $('#loginErr').textContent = '';
      try { const ok = await backend.adminLogin($('#pw').value); if (!ok) { $('#loginErr').textContent = 'Kata laluan salah.'; } }
      catch (err) { console.error(err); $('#loginErr').textContent = 'Log masuk gagal: ' + (err.code || err.message); }
      btn.disabled = false; btn.textContent = 'Log masuk';
    });
    return;
  }
  app.innerHTML = `<div class="admin-head"><div><div class="eyebrow">Panel Admin</div><h2 style="font-size:22px">${esc(S.hubTitle)}</h2></div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="tabs"><button data-t="video" class="${adminTab === 'video' ? 'on' : ''}">Video</button><button data-t="markah" class="${adminTab === 'markah' ? 'on' : ''}">Markah murid</button></div>
    <button class="btn btn-ghost btn-sm" id="logout">Log keluar</button></div></div><div id="adminBody"></div>`;
  app.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { adminTab = b.dataset.t; viewAdmin(); });
  $('#logout').onclick = async () => { await backend.adminLogout(); toast('Anda telah log keluar.'); };
  if (adminTab === 'video') adminVideos(); else adminScores();
}
function adminVideos() {
  const body = $('#adminBody');
  const ready = MODS.filter(m => videos[m.code]).length;
  body.innerHTML = `<div class="card"><div class="filters" style="justify-content:space-between"><span><b>${ready}/${MODS.length}</b> video telah dimuat naik</span><span class="muted" style="font-size:13px">Format MP4 disyorkan. Klik "Pilih fail" atau seret fail video ke baris modul.</span></div>
  <div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>Modul</th><th>Tajuk</th><th>Status</th><th style="text-align:right">Tindakan</th></tr></thead><tbody>
  ${MODS.map(m => { const v = videos[m.code]; return `<tr class="drop" data-code="${m.code}"><td class="mono">${m.code}</td><td>${esc(m.title)}</td>
    <td class="up-cell">${v ? `<span class="chip ok">Sedia</span> <span class="muted" style="font-size:12.5px">${v.size ? fmtSize(v.size) + ' · ' : ''}${fmtDate(v.uploadedAt)}</span>` : '<span class="chip">Belum dimuat naik</span>'}
      <div class="up-bar" hidden><div class="bar"><i style="width:0%"></i></div><span class="muted mono" style="font-size:12px">0%</span></div></td>
    <td><div class="up-actions"><input type="file" accept="video/*" hidden><button class="btn btn-primary btn-sm" data-act="pick">${v ? 'Ganti' : 'Pilih fail'}</button>
      ${v ? `<a class="btn btn-ghost btn-sm" href="#/modul/${m.code}">Pratonton</a><button class="btn btn-danger btn-sm" data-act="del">Padam</button>` : ''}</div></td></tr>`; }).join('')}
  </tbody></table></div></div>`;
  body.querySelectorAll('tr[data-code]').forEach(tr => {
    const code = tr.dataset.code; const input = tr.querySelector('input[type=file]');
    const doUpload = async file => {
      if (!file) return; if (!file.type.startsWith('video/')) { toast('Sila pilih fail video (MP4).'); return; }
      const bar = tr.querySelector('.up-bar'); bar.hidden = false; tr.querySelectorAll('button').forEach(b => b.disabled = true);
      try {
        await backend.uploadVideo(code, file, f => { bar.querySelector('i').style.width = Math.round(f * 100) + '%'; bar.querySelector('span').textContent = Math.round(f * 100) + '%'; });
        videos = await backend.listVideos(); toast(`${code} berjaya dimuat naik.`); adminVideos();
      } catch (e) { console.error(e); toast('Muat naik gagal: ' + (e.code || e.message)); adminVideos(); }
    };
    tr.querySelector('[data-act=pick]').onclick = () => input.click();
    input.onchange = () => doUpload(input.files[0]);
    const del = tr.querySelector('[data-act=del]');
    if (del) del.onclick = async () => { if (!armed(del, 'Klik lagi untuk sahkan')) return; try { await backend.deleteVideo(code); videos = await backend.listVideos(); toast(`${code} dipadam.`); adminVideos(); } catch (e) { toast('Gagal memadam: ' + (e.code || e.message)); } };
    tr.addEventListener('dragover', e => { e.preventDefault(); tr.classList.add('over'); });
    tr.addEventListener('dragleave', () => tr.classList.remove('over'));
    tr.addEventListener('drop', e => { e.preventDefault(); tr.classList.remove('over'); doUpload(e.dataTransfer.files[0]); });
  });
}
async function adminScores() {
  const body = $('#adminBody'); body.innerHTML = '<div class="card empty">Memuatkan markah…</div>';
  let all = [];
  try { all = await backend.listScores(); } catch (e) { body.innerHTML = `<div class="card empty">Gagal memuatkan markah: ${esc(e.code || e.message)}</div>`; return; }
  const kelasList = [...new Set(all.map(s => s.kelas))].sort();
  let fk = '', fm = '', fq = '', best = false;
  const draw = () => {
    let rows = all.filter(s => (!fk || s.kelas === fk) && (!fm || s.code === fm) && (!fq || s.name.toLowerCase().includes(fq)));
    if (best) { const m = new Map(); rows.forEach(s => { const k = s.name.toLowerCase() + '|' + s.kelas + '|' + s.code; const c = m.get(k); if (!c || s.score > c.score) m.set(k, s); }); rows = [...m.values()]; }
    const students = new Set(rows.map(s => s.name.toLowerCase() + '|' + s.kelas)).size;
    const avg = rows.length ? Math.round(rows.reduce((a, s) => a + s.score / s.total, 0) / rows.length * 100) : 0;
    const pass = rows.length ? Math.round(rows.filter(s => s.score / s.total >= 0.6).length / rows.length * 100) : 0;
    $('#kpis').innerHTML = [[rows.length, 'Rekod percubaan'], [students, 'Murid'], [avg + '%', 'Purata markah'], [pass + '%', 'Mencapai ≥ 60%']].map(([b, s]) => `<div class="card kpi"><b>${b}</b><span>${s}</span></div>`).join('');
    $('#scoreRows').innerHTML = rows.length ? rows.map(s => `<tr><td>${fmtDate(s.at)}</td><td>${esc(s.name)}</td><td>${esc(s.kelas)}</td><td class="mono">${esc(s.code)}</td><td class="num"><b>${s.score}/${s.total}</b></td><td class="num">${Math.round(s.score / s.total * 100)}%</td></tr>`).join('')
      : '<tr><td colspan="6" class="empty">Tiada rekod markah.</td></tr>';
    body._rows = rows;
  };
  body.innerHTML = `<div class="kpis" id="kpis"></div>
  <div class="card"><div class="filters">
    <input class="input" id="fq" placeholder="Cari nama…">
    <select class="input" id="fk"><option value="">Semua kelas</option>${kelasList.map(k => `<option>${esc(k)}</option>`).join('')}</select>
    <select class="input" id="fm"><option value="">Semua modul</option>${MODS.map(m => `<option value="${m.code}">${m.code} · ${esc(m.title)}</option>`).join('')}</select>
    <label style="display:flex;gap:6px;align-items:center;font-size:13.5px;font-weight:600"><input type="checkbox" id="fb"> Markah terbaik sahaja</label>
    <span style="flex:1"></span>
    <button class="btn btn-ghost btn-sm" id="csv">Muat turun CSV</button>
    <button class="btn btn-danger btn-sm" id="clear">Padam rekod dipaparkan</button>
  </div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tarikh</th><th>Nama</th><th>Kelas</th><th>Modul</th><th class="num">Markah</th><th class="num">%</th></tr></thead><tbody id="scoreRows"></tbody></table></div></div>`;
  $('#fq').oninput = e => { fq = e.target.value.trim().toLowerCase(); draw(); };
  $('#fk').onchange = e => { fk = e.target.value; draw(); };
  $('#fm').onchange = e => { fm = e.target.value; draw(); };
  $('#fb').onchange = e => { best = e.target.checked; draw(); };
  $('#csv').onclick = () => {
    const rows = body._rows || []; const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = ['Tarikh,Nama,Kelas,Modul,Markah,Jumlah,Peratus', ...rows.map(s => [fmtDate(s.at), s.name, s.kelas, s.code, s.score, s.total, Math.round(s.score / s.total * 100)].map(q).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = `markah-${SUBJECT}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  $('#clear').onclick = async () => {
    const rows = body._rows || []; if (!rows.length) return;
    if (!armed($('#clear'), `Sahkan padam ${rows.length} rekod`)) return;
    try { await backend.deleteScores(rows.map(r => r.id)); toast('Rekod dipadam.'); adminScores(); } catch (e) { toast('Gagal memadam: ' + (e.code || e.message)); }
  };
  draw();
}

// ------------------------------------------------------------ boot
(async function boot() {
  document.title = S.hubTitle; $('#brandTitle').textContent = S.name; $('#brandSub').textContent = 'oleh Cikgu Dzurri · copyright@dzurrihensem'; $('#yr').textContent = new Date().getFullYear();
  if (isDemo) $('#demoBar').hidden = false;
  app.innerHTML = '<div class="empty">Memuatkan…</div>';
  try { videos = await backend.listVideos(); } catch (e) { console.error(e); toast('Gagal memuatkan senarai video.'); }
  backend.onAdmin(a => { const changed = a !== isAdmin; isAdmin = a; if (changed && location.hash.startsWith('#/admin')) viewAdmin(); });
  window.addEventListener('hashchange', route);
  route();
})();
