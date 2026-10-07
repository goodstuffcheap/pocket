const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scan: () => ipcRenderer.invoke('library:scan'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (cfg) => ipcRenderer.invoke('config:set', cfg),
  pickFolder: (title) => ipcRenderer.invoke('dialog:folder', title),
  pickExe: () => ipcRenderer.invoke('dialog:exe'),
  detectEmus: (dir) => ipcRenderer.invoke('emu:detect', dir),
  onScrape: (cb) => ipcRenderer.on('scrape', (_e, d) => cb(d)),
  scrapeStart: (force, manual) => ipcRenderer.invoke('scrape:start', force, manual),
  artCandidates: (t) => ipcRenderer.invoke('art:candidates', t),
  setArt: (g, k, src) => ipcRenderer.invoke('art:set', g, k, src),
  pickImage: () => ipcRenderer.invoke('dialog:image'),
  metaSearch: (t, sys) => ipcRenderer.invoke('meta:search', t, sys),
  setMeta: (g, id) => ipcRenderer.invoke('meta:set', g, id),
  getSounds: () => ipcRenderer.invoke('sounds:get'),
  pickAudio: () => ipcRenderer.invoke('dialog:audio'),
  toggleFullscreen: () => ipcRenderer.invoke('win:fullscreen'),
  quit: () => ipcRenderer.invoke('app:quit'),
  setFav: (k, on) => ipcRenderer.invoke('fav:set', k, on),
  launch: (game) => ipcRenderer.invoke('game:launch', game),
});
