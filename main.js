const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

// Artwork cache, favorites and play time live in %APPDATA%\pocket, both with `npm start` and in the installed app.
app.setPath('userData', path.join(app.getPath('appData'), 'pocket'));
// Settings (ROM folder, emulators, which system uses which, API keys) live in config.json.
// With `npm start` it sits next to this file. The installed app is read-only, so it uses the data folder instead.
const CONFIG_PATH = app.isPackaged ? path.join(app.getPath('userData'), 'config.json') : path.join(__dirname, 'config.json');
function loadConfig() {
  const base = { romsDir: 'D:\\ROMs', emulatorsDir: '', steamGridDbKey: '', rawgKey: '', emulators: {}, systems: {},
    sounds: {}, musicVolume: 40, sfxVolume: 70 };
  try { return { ...base, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; }
  catch (e) { return base; }
}
let mainWin;

const SYSTEM_NAMES = {
  desktop: 'Desktop', gb: 'Game Boy', gbc: 'Game Boy Color', gba: 'Game Boy Advance',
  gc: 'GameCube', wii: 'Wii', wiiu: 'Wii U', switch: 'Switch', genesis: 'Genesis',
  n3ds: 'Nintendo 3DS', n64: 'Nintendo 64', nds: 'Nintendo DS', nes: 'NES',
  snesna: 'SNES', snes: 'SNES', ps2: 'PlayStation 2', ps3: 'PlayStation 3',
  ps4: 'PlayStation 4', psp: 'PSP', psvita: 'PS Vita', psx: 'PlayStation', saturn: 'Saturn',
};
const SKIP_EXT = new Set(['.txt', '.xml', '.png', '.jpg', '.jpeg', '.gif', '.srm', '.sav',
  '.state', '.cfg', '.ini', '.db', '.nfo', '.md', '.pdf', '.mp4', '.mp3', '.json', '.log', '.bak']);
const SKIP_DIRS = new Set(['media', 'images', 'downloaded_media', 'gamelists', 'manuals',
  'covers', 'videos', 'screenshots']);

function cleanName(file) {
  const base = path.parse(file).name;
  return base.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').replace(/_/g, ' ').trim() || base;
}

function scanLibrary() {
  const systems = [], games = [];
  const cfg = loadConfig();
  const ROMS_DIR = cfg.romsDir;
  let dirs;
  try {
    dirs = fs.readdirSync(ROMS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  } catch (e) {
    return { systems, games, error: String(e) };
  }
  for (const d of dirs) {
    const id = d.name;
    const dir = path.join(ROMS_DIR, id);
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const names = new Set(entries.map(e => e.name.toLowerCase()));
    let count = 0;
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name.toLowerCase())) continue;
      } else {
        if (SKIP_EXT.has(ext)) continue;
        // skip the .bin half of a .cue/.bin pair
        if (ext === '.bin' && names.has(path.parse(e.name).name.toLowerCase() + '.cue')) continue;
      }
      const full = path.join(dir, e.name);
      let size = 0;
      try { if (!e.isDirectory()) size = fs.statSync(full).size; } catch {}
      const gk = gkey({ system: id, file: e.name });
      games.push({ name: cleanName(e.name), file: e.name, system: id, path: full, size, key: gk,
        art: artFor({ system: id, file: e.name }), meta: (artDB[gk] || {}).meta || null,
        fav: userDB.favs.includes(gk), stats: userDB.stats[gk] || {} });
      count++;
    }
    if (count) systems.push({ id, name: SYSTEM_NAMES[id] || id, count, emu: cfg.systems[id] || null });
  }
  systems.sort((a, b) => a.name.localeCompare(b.name));
  games.sort((a, b) => a.name.localeCompare(b.name));
  return { systems, games };
}

ipcMain.handle('library:scan', () => scanLibrary());

// ---------- artwork (SteamGridDB) ----------
const ART_DIR = path.join(app.getPath('userData'), 'art');
const ART_DB = path.join(ART_DIR, 'art.json');
const SGDB = 'https://www.steamgriddb.com/api/v2';
const USER_DB = path.join(app.getPath('userData'), 'user.json');
let userDB = { favs: [], stats: {} };
try { userDB = { ...userDB, ...JSON.parse(fs.readFileSync(USER_DB, 'utf8')) }; } catch {}
function saveUser() { fs.mkdirSync(path.dirname(USER_DB), { recursive: true }); fs.writeFileSync(USER_DB, JSON.stringify(userDB)); }
let artDB = {};
try { artDB = JSON.parse(fs.readFileSync(ART_DB, 'utf8')); } catch {}
function saveArt() { fs.mkdirSync(ART_DIR, { recursive: true }); fs.writeFileSync(ART_DB, JSON.stringify(artDB)); }
function gkey(g) { return crypto.createHash('sha1').update(g.system + '|' + g.file).digest('hex').slice(0, 16); }
function toUrl(p) {
  if (!p) return null;
  try { return pathToFileURL(p).href + '?v=' + Math.floor(fs.statSync(p).mtimeMs); } catch { return null; }
}
function artFor(g) {
  const a = artDB[gkey(g)] || {};
  return { icon: toUrl(a.icon), banner: toUrl(a.banner), logo: toUrl(a.logo) };
}
const send = (o) => { if (mainWin) mainWin.webContents.send('scrape', o); };

async function sg(p) {
  const key = loadConfig().steamGridDbKey;
  if (!key) throw new Error('No SteamGridDB API key set.');
  const r = await fetch(SGDB + p, { headers: { Authorization: 'Bearer ' + key } });
  if (!r.ok) throw new Error('SteamGridDB error ' + r.status);
  return (await r.json()).data || [];
}
async function candidates(term) {
  const game = (await sg('/search/autocomplete/' + encodeURIComponent(term)))[0];
  if (!game) return { name: null };
  const [icon, banner, logo] = await Promise.all([
    sg(`/grids/game/${game.id}?dimensions=512x512,1024x1024&types=static&nsfw=false`),
    sg(`/heroes/game/${game.id}?types=static&nsfw=false`),
    sg(`/logos/game/${game.id}?types=static&nsfw=false`),
  ].map(p => p.catch(() => [])));
  const pick = (arr) => arr.slice(0, 12).map(x => ({ url: x.url, thumb: x.thumb || x.url }));
  return { name: game.name, icon: pick(icon), banner: pick(banner), logo: pick(logo) };
}
async function setArt(g, kind, src, lock) {
  const k = gkey(g), dir = path.join(ART_DIR, k);
  fs.mkdirSync(dir, { recursive: true });
  const remote = /^https?:/.test(src);
  const ext = remote ? (path.extname(new URL(src).pathname) || '.png') : path.extname(src);
  const dest = path.join(dir, kind + ext);
  if (remote) {
    const r = await fetch(src);
    if (!r.ok) throw new Error('Download failed (' + r.status + ')');
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  } else fs.copyFileSync(src, dest);
  const a = artDB[k] || (artDB[k] = {});
  if (a[kind] && a[kind] !== dest) { try { fs.unlinkSync(a[kind]); } catch {} }
  a[kind] = dest;
  if (lock) a.locked = true;
  saveArt();
}
const RAWG_PLAT = { desktop: 4, switch: 7, n3ds: 8, nds: 9, gc: 105, wii: 11, wiiu: 10, gba: 24, gb: 26, gbc: 43,
  n64: 83, nes: 49, snesna: 79, snes: 79, genesis: 167, ps2: 15, ps3: 16, ps4: 18, psp: 17, psvita: 19, psx: 27, saturn: 107 };
async function rawg(p) {
  const key = loadConfig().rawgKey;
  if (!key) throw new Error('No RAWG API key set.');
  const r = await fetch(`https://api.rawg.io/api/${p}${p.includes('?') ? '&' : '?'}key=${key}`);
  if (!r.ok) throw new Error('RAWG error ' + r.status);
  return r.json();
}
// full details for one RAWG game id; shots come from the search result when we have it
async function metaById(id, shots) {
  const d = await rawg('games/' + id);
  if (!shots) shots = ((await rawg(`games/${id}/screenshots?page_size=4`).catch(() => ({}))).results || []).map(s => s.image);
  return { id: d.id, name: d.name, desc: (d.description_raw || '').trim(), released: d.released || '',
    developers: (d.developers || []).map(x => x.name), publishers: (d.publishers || []).map(x => x.name),
    genres: (d.genres || []).map(x => x.name), metacritic: d.metacritic || null,
    esrb: d.esrb_rating ? d.esrb_rating.name : '', shots: shots.slice(0, 3) };
}
async function fetchMeta(g) {
  const q = encodeURIComponent(g.name), pl = RAWG_PLAT[g.system];
  let res = (await rawg(`games?search=${q}&search_precise=true&page_size=3${pl ? '&platforms=' + pl : ''}`)).results || [];
  if (!res.length && pl) res = (await rawg(`games?search=${q}&page_size=3`)).results || [];
  if (!res[0]) return null;
  return metaById(res[0].id, (res[0].short_screenshots || []).slice(1, 4).map(s => s.image));
}
// list of possible RAWG matches for the info picker, games on this system first
async function metaSearch(term, system) {
  const pl = RAWG_PLAT[system];
  const res = (await rawg(`games?search=${encodeURIComponent(term)}&page_size=12`)).results || [];
  const out = res.map(r => {
    const plats = (r.platforms || []).map(p => p.platform);
    return { id: r.id, name: r.name, released: r.released || '', image: r.background_image || null,
      platforms: plats.map(p => p.name), match: !!pl && plats.some(p => p.id === pl) };
  });
  return out.filter(r => r.match).concat(out.filter(r => !r.match));
}
async function scrapeGame(g, cfg, force) {
  const a = artDB[gkey(g)] || (artDB[gkey(g)] = {});
  if (cfg.steamGridDbKey && (force || !a.tried)) {
    const c = await candidates(g.name);
    if (c.name) for (const kind of ['icon', 'banner', 'logo'])
      if (c[kind] && c[kind][0] && !(a.locked && a[kind])) await setArt(g, kind, c[kind][0].url);
    a.tried = true;
  }
  // metaLocked: the user picked (or cleared) the game info by hand, so scraping leaves it alone
  if (cfg.rawgKey && !a.metaLocked && (force || (!a.meta && !a.metaTried))) {
    const md = await fetchMeta(g);
    if (md) a.meta = md;
    a.metaTried = true;
  }
  saveArt();
}
let scraping = false;
async function scrapeAll(force, manual) {
  if (scraping) return;
  const cfg = loadConfig();
  if (!cfg.steamGridDbKey && !cfg.rawgKey) { send({ type: 'done', error: 'nokey', manual }); return; }
  scraping = true;
  const need = (g) => {
    const a = artDB[gkey(g)] || {};
    return force || (cfg.steamGridDbKey && !a.tried) || (cfg.rawgKey && !a.metaLocked && !a.meta && !a.metaTried);
  };
  const q = scanLibrary().games.filter(need), total = q.length;
  let done = 0, fails = 0, fatal = null;
  async function worker() {
    while (q.length && !fatal) {
      const g = q.shift();
      try { await scrapeGame(g, cfg, force); fails = 0; }
      catch (e) {
        fails++;
        if (/ 40[13]/.test(e.message)) fatal = 'An API key was rejected (' + e.message + ').';
        else if (fails >= 5) fatal = 'Scraping stopped: ' + e.message;
      }
      done++;
      send({ type: 'progress', done, total, name: g.name });
      send({ type: 'art', key: gkey(g), art: artFor(g), meta: (artDB[gkey(g)] || {}).meta || null });
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  saveArt(); scraping = false;
  send({ type: 'done', error: fatal, manual });
}
ipcMain.handle('fav:set', (_e, key, on) => {
  const s = new Set(userDB.favs); on ? s.add(key) : s.delete(key);
  userDB.favs = [...s]; saveUser(); return true;
});
ipcMain.handle('scrape:start', (_e, force, manual) => { scrapeAll(!!force, !!manual); return true; });
ipcMain.handle('art:candidates', async (_e, term) => { try { return await candidates(term); } catch (e) { return { error: e.message }; } });
ipcMain.handle('art:set', async (_e, g, kind, src) => {
  try { await setArt(g, kind, src, true); return { art: artFor(g) }; } catch (e) { return { error: e.message }; }
});
ipcMain.handle('meta:search', async (_e, term, system) => {
  try { return { results: await metaSearch(term, system) }; } catch (e) { return { error: e.message }; }
});
// id = a RAWG game id to use for this game, or null to clear the info. Either way it is locked from scraping.
ipcMain.handle('meta:set', async (_e, g, id) => {
  try {
    const a = artDB[gkey(g)] || (artDB[gkey(g)] = {});
    a.meta = id ? await metaById(id) : null;
    a.metaLocked = true; a.metaTried = true; saveArt();
    return { meta: a.meta };
  } catch (e) { return { error: e.message }; }
});

// ---------- sounds ----------
// Each slot uses the file the user picked in Settings, or the placeholder in the sounds folder.
const SOUND_SLOTS = ['music', 'move', 'select', 'back', 'switch', 'launch'];
ipcMain.handle('sounds:get', () => {
  const custom = loadConfig().sounds || {}, out = {};
  for (const s of SOUND_SLOTS) {
    const c = custom[s] && fs.existsSync(custom[s]) ? custom[s] : null;
    out[s] = { url: toUrl(c || path.join(__dirname, 'sounds', s + '.wav')), custom: c, missing: !!custom[s] && !c };
  }
  return out;
});
ipcMain.handle('dialog:audio', async () => {
  const r = await dialog.showOpenDialog(mainWin, { properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'ogg', 'wav', 'flac', 'm4a', 'opus', 'webm'] }] });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('dialog:image', async () => {
  const r = await dialog.showOpenDialog(mainWin, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }] });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('config:get', () => loadConfig());
ipcMain.handle('config:set', (_e, cfg) => {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); return true;
});
ipcMain.handle('dialog:folder', async (_e, title) => {
  const r = await dialog.showOpenDialog(mainWin, { title, properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('dialog:exe', async () => {
  const r = await dialog.showOpenDialog(mainWin, { properties: ['openFile'],
    filters: [{ name: 'Programs', extensions: ['exe', 'bat', 'lnk'] }, { name: 'All files', extensions: ['*'] }] });
  return r.canceled ? null : r.filePaths[0];
});
function findExes(dir, depth = 0, out = []) {
  let es;
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { if (depth < 2) findExes(f, depth + 1, out); }
    else if (/\.exe$/i.test(e.name) && !/unins|vcredist|crash|update|setup|redist|helper/i.test(e.name)) out.push(f);
  }
  return out;
}
ipcMain.handle('emu:detect', (_e, dir) => findExes(dir));

ipcMain.handle('game:launch', (_e, { system, path: rom, key }) => {
  const cfg = loadConfig();
  const emu = cfg.emulators[cfg.systems[system]];
  if (!emu) return { ok: false, error: `No emulator set for "${system}". Add one in config.json.` };
  if (!fs.existsSync(emu.exe)) return { ok: false, error: `Emulator not found: ${emu.exe}` };
  const args = (emu.args || ['{rom}']).map(a => a.replace('{rom}', () => rom));
  return new Promise(resolve => {
    const child = spawn(emu.exe, args, { cwd: path.dirname(emu.exe), stdio: 'ignore' });
    let started = false, t0 = 0;
    child.on('error', err => resolve({ ok: false, error: String(err) }));
    child.on('spawn', () => {
      started = true; t0 = Date.now();
      if (key) {
        const s = userDB.stats[key] || (userDB.stats[key] = {});
        s.launches = (s.launches || 0) + 1; s.last = t0; saveUser();
        send({ type: 'stats', key, stats: s });
      }
      if (mainWin) mainWin.minimize();
      resolve({ ok: true });
    });
    child.on('exit', () => {
      if (!started) return;
      const s = key && userDB.stats[key];
      if (s) { s.played = (s.played || 0) + (Date.now() - t0); saveUser(); send({ type: 'stats', key, stats: s }); }
      send({ type: 'exited' });
      if (mainWin) { mainWin.restore(); mainWin.focus(); }
    });
  });
});

function createWindow() {
  const win = mainWin = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#2d2d2d',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
  });
  win.loadFile('index.html');
  win.webContents.once('did-finish-load', () => setTimeout(() => scrapeAll(false, false), 1500));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
