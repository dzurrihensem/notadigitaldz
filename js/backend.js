// Lapisan data: Firebase (sebenar) atau Demo (localStorage + IndexedDB).
import { SUBJECT, ADMIN_EMAIL, firebaseConfig } from './config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
export const isDemo = !firebaseConfig.apiKey;

// ------------------------------------------------------------------ FIREBASE
function firebaseBackend() {
  let fs, st, au, m = {};
  let adminUser = null; const listeners = new Set();
  const ready = (async () => {
    const [app, firestore, storage, auth] = await Promise.all([
      import(FB + 'firebase-app.js'), import(FB + 'firebase-firestore.js'),
      import(FB + 'firebase-storage.js'), import(FB + 'firebase-auth.js')]);
    Object.assign(m, firestore, storage, auth);
    const a = app.initializeApp(firebaseConfig);
    fs = firestore.getFirestore(a); st = storage.getStorage(a); au = auth.getAuth(a);
    auth.onAuthStateChanged(au, u => { adminUser = u && u.email === ADMIN_EMAIL ? u : null; listeners.forEach(f => f(!!adminUser)); });
  })();
  const vCol = () => m.collection(fs, 'hubs', SUBJECT, 'videos');
  const sCol = () => m.collection(fs, 'hubs', SUBJECT, 'scores');
  return {
    ready,
    async listVideos() {
      await ready; const snap = await m.getDocs(vCol()); const out = {};
      snap.forEach(d => { out[d.id] = d.data(); }); return out;
    },
    async uploadVideo(code, file, onProgress) {
      await ready; const path = `videos/${SUBJECT}/${code}.mp4`; const r = m.ref(st, path);
      const task = m.uploadBytesResumable(r, file, { contentType: file.type || 'video/mp4' });
      await new Promise((res, rej) => task.on('state_changed', s => onProgress && onProgress(s.bytesTransferred / s.totalBytes), rej, res));
      const url = await m.getDownloadURL(r);
      await m.setDoc(m.doc(vCol(), code), { url, path, name: file.name, size: file.size, uploadedAt: m.serverTimestamp() });
      return url;
    },
    async deleteVideo(code) {
      await ready; try { await m.deleteObject(m.ref(st, `videos/${SUBJECT}/${code}.mp4`)); } catch (e) { if (e.code !== 'storage/object-not-found') throw e; }
      await m.deleteDoc(m.doc(vCol(), code));
    },
    async submitScore(s) {
      await ready; await m.addDoc(sCol(), { ...s, at: m.serverTimestamp() });
    },
    async listScores() {
      await ready; const snap = await m.getDocs(m.query(sCol(), m.orderBy('at', 'desc')));
      return snap.docs.map(d => { const x = d.data(); return { id: d.id, ...x, at: x.at ? x.at.toDate() : new Date() }; });
    },
    async deleteScores(ids) { await ready; await Promise.all(ids.map(id => m.deleteDoc(m.doc(sCol(), id)))); },
    async adminLogin(password) {
      await ready;
      try { await m.signInWithEmailAndPassword(au, ADMIN_EMAIL, password); return true; }
      catch (e) { if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(e.code)) return false; throw e; }
    },
    async adminLogout() { await ready; await m.signOut(au); },
    onAdmin(f) { listeners.add(f); f(!!adminUser); return () => listeners.delete(f); },
  };
}

// ------------------------------------------------------------------ DEMO
function demoBackend() {
  const K = k => `hub-demo-${SUBJECT}-${k}`;
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(K(k))) ?? d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(K(k), JSON.stringify(v)); } catch { } };
  const db = new Promise((res, rej) => { const r = indexedDB.open('hub-demo-videos', 1); r.onupgradeneeded = () => r.result.createObjectStore('v'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const idb = async (mode, fn) => { const d = await db; return new Promise((res, rej) => { const tx = d.transaction('v', mode); const q = fn(tx.objectStore('v')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }); };
  let admin = sessionStorage.getItem(K('admin')) === '1'; const listeners = new Set();
  const urls = {};
  const sha = async t => { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(t), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(DEMO_SALT.match(/../g).map(h => parseInt(h, 16))), iterations: 150000 }, k, 256);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join(''); };
  return {
    ready: Promise.resolve(),
    async listVideos() {
      const meta = get('videos', {}); const out = {};
      for (const code of Object.keys(meta)) {
        if (!urls[code]) { const blob = await idb('readonly', s => s.get(`${SUBJECT}-${code}`)); if (blob) urls[code] = URL.createObjectURL(blob); }
        if (urls[code]) out[code] = { ...meta[code], url: urls[code], uploadedAt: new Date(meta[code].uploadedAt) };
      }
      return out;
    },
    async uploadVideo(code, file, onProgress) {
      for (let i = 1; i <= 10; i++) { await new Promise(r => setTimeout(r, 60)); onProgress && onProgress(i / 10); }
      await idb('readwrite', s => s.put(file, `${SUBJECT}-${code}`));
      const meta = get('videos', {}); meta[code] = { name: file.name, size: file.size, uploadedAt: Date.now() }; set('videos', meta);
      if (urls[code]) URL.revokeObjectURL(urls[code]); urls[code] = URL.createObjectURL(file); return urls[code];
    },
    async deleteVideo(code) {
      await idb('readwrite', s => s.delete(`${SUBJECT}-${code}`));
      const meta = get('videos', {}); delete meta[code]; set('videos', meta); if (urls[code]) { URL.revokeObjectURL(urls[code]); delete urls[code]; }
    },
    async submitScore(s) { const all = get('scores', []); all.unshift({ ...s, id: Math.random().toString(36).slice(2), at: Date.now() }); set('scores', all); },
    async listScores() { return get('scores', []).map(s => ({ ...s, at: new Date(s.at) })); },
    async deleteScores(ids) { set('scores', get('scores', []).filter(s => !ids.includes(s.id))); },
    async adminLogin(password) {
      const ok = (await sha(password)) === DEMO_HASH;
      if (ok) { admin = true; sessionStorage.setItem(K('admin'), '1'); listeners.forEach(f => f(true)); }
      return ok;
    },
    async adminLogout() { admin = false; sessionStorage.removeItem(K('admin')); listeners.forEach(f => f(false)); },
    onAdmin(f) { listeners.add(f); f(admin); return () => listeners.delete(f); },
  };
}
// Cincangan PBKDF2 kata laluan admin untuk MOD DEMO sahaja. Dalam mod Firebase,
// kata laluan disemak oleh Firebase Authentication dan tidak disimpan dalam kod.
const DEMO_SALT = 'c0affef4f366f667d931b3d247dcabcf';
const DEMO_HASH = '27f063d3fff1a83df6c3d7d2e3c799db8fea6cda5bcecfb86235fc1210d6a98f';

export const backend = isDemo ? demoBackend() : firebaseBackend();
