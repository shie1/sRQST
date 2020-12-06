const {
    app,
    BrowserWindow
} = require('electron');
const path = require('path');
const fs = require('fs')
const cp = require('child_process')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

try {
    fs.readFileSync('./credits.txt')
    fs.readdirSync('./downloads')
} catch (error) {
    try {
        fs.mkdirSync('./downloads')
    } catch (error) {}
    try {
        fs.writeFileSync('./credits.txt', '| 2020 December 5\n| Design and development: Shie1\n| Electron app template: Fireship (https://www.youtube.com/channel/UCsBjURrPoezykLs9EqgamOA)\n| Audio & Video reencoding source code: TimeForANinja (https://github.com/TimeForANinja)\n| Icons: Smashicons from flaticon.com\n| Made with:\n    nodejs\n    ffmpeg\n    jquery\n    ytdl-core\n    electron\n    electron-forge')
    } catch (error) {}
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        transparent: true,
        frame: false,
        resizable: false,
        webPreferences: {
            //devTools: false,
            nodeIntegration: true
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.