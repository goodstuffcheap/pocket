# pocket

### info
3ds style frontend like cocoon/iisu but for pc\
for personal use (me, i don't intend to make changes unless its to fit my own needs)\
this is not an emulator\
your ROM folder should be structured like [ES-DE](https://github.com/retrogamecorps/ES-DE-Directories)\
made with ai\
subject to visual changes
### download
grab the latest `Pocket-x.x.x.zip` from [releases](https://github.com/goodstuffcheap/pocket/releases), right click it and choose Extract All, then run `Pocket.exe` from the extracted folder. nothing gets installed\
windows smartscreen will warn you the first time because the app is not code signed (More info, Run anyway)\
got the release? skip ahead to [using](#using)
### setup (building only)
- Windows (10/11)
- [Node.js](https://nodejs.org) LTS
- [Git](https://git-scm.com)
```
git clone https://github.com/goodstuffcheap/pocket.git
cd pocket
npm install
npm start
```
npm install sets up Electron
### updating (building only)
```
git pull
npm install
npm start
```
### using
1. name your rom subfolders (e.g. nds, n3ds, switch, wii, gc) [see the top of this readme for the organization of your roms folder]
2. open settings (gear at the bottom, M key, or Start)
3. set your roms folder (e.g. C:\ROMs)
4. optionally set emulator folder which helps suggest .exe files (e.g. something like C:\Emulators which would contain C:\Emulators\EmulatorA\A.exe, C:\Emulators\EmulatorB\B.exe)
5. point to your emulator .exe (pocket will suggest your exe if you followed previous step)
6. optionally paste a [SteamGridDB](https://www.steamgriddb.com) API key for artwork (pocket will fetch automatically on startup, however the refresh button at the bottom bar starts a re-scrape)
7. optionally paste a [RAWG](https://rawg.io/apidocs) API key for game info
8. you can manually set your own artwork for games by clicking the picture icon in the bottom right of the game banner
9. if a game got the wrong description, open it and press Game info to pick the right game from RAWG
10. added or removed roms? press Rescan in settings
11. sounds and music use placeholders until you pick your own files in settings (Sound section)

pocket starts in fullscreen. press F11 to switch to a window and back, or use the Window row in settings (it also has a Quit button for controllers)
### controls
| Action | Keyboard | Controller (XBOX Layout) |
| :--- | :---: | :---: |
| Move | Arrow Keys / WASD | D-Pad / Left Stick |
| Open Game / Press button | Enter | A |
| Back / Close / Clear search | Escape / Backspace | B |
| Change Artwork | X | Y |
| Play Stats | P | X |
| Previous / Next System | Q / E | LB / RB |
| Change Sort | O | Select (View) |
| Search | / or Ctrl+F | (keyboard only) |
| Settings | M | Start |
| Fullscreen | F11 | (Settings) |
| Quit | Alt+F4 | (Settings) |
### building the release
```
npm run dist
```
this makes `dist\Pocket-<version>.zip` (the version comes from package.json), a zipped copy of the app. share that zip, nothing else from dist is needed\
(a single-file exe was tried, but it unpacks itself every launch and takes about 20 seconds to open, so the release is a zipped folder instead)
### where data is stored
config.json: next to the project when you use npm start, in %APPDATA%\pocket when you use the release\
artwork, game info, favorites, play time: %APPDATA%\pocket (shared by both)
### credits
the font used is the [JetBrains Mono Nerd Font](https://github.com/JetBrains/JetBrainsMono) Copyright 2020 The JetBrains Mono Project Authors | [SIL Open Font License 1.1](https://openfontlicense.org)\
game descriptions, genres, release dates, developers, publishers, and screenshots all provided by the [RAWG](https://rawg.io) API\
recommended artwork is provided by [SteamGridDB](https://www.steamgriddb.com)
