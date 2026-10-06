# pocket

### info
3ds style frontend like cocoon/iisu but for pc\
for personal use (me, i don't intend to make changes unless its to fit my own needs)\
this is not an emulator\
your ROM folder should be structured like [ES-DE](https://github.com/retrogamecorps/ES-DE-Directories)\
made with ai\
subject to visual changes
### setup
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
### updating
```
git pull
npm install
npm start
```
### using
1. name your rom subfolders (i.e. nds, n3ds, switch, wii, gc) [see the top of this readme for the organization of your roms folder]
2. open settings (gear at the bottom, M key, or Start)
3. set your roms folder (i.e. C:\ROMs)
4. optionally set emulator folder which helps suggest .exe files (i.e. something like C:\Emulators which would contain C:\Emulators\EmulatorA\A.exe, C:\Emulators\EmulatorB\B.exe)
5. point to your emulator .exe (pocket will suggest your exe if you followed previous step)
6. optionally paste a [SteamGridDB](https://www.steamgriddb.com) API key for artwork (pocket will fetch automatically on startup, however the refresh button at the bottom bar starts a re-scrape)
7. optionally paste a [RAWG](https://rawg.io/apidocs) API key for game info
8. you can manually set your own artwork for games by clicking the picture icon in the bottom right of the game banner
### controls
| Action | Keyboard | Controller (XBOX Layout) |
| :--- | :---: | ---: |
| Move | Arrow Keys / WASD | D-Pad / Left Stick |
| Open Game | Enter | A
| Back | Escape / Backspace | B
| Change Artwork | X | Y |
| Settings | M | Start |
### where data is stored
config.json in your local folder
artwork, game info, favorites, play time: %APPDATA%\pocket
