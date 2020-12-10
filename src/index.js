const {
    app,
    BrowserWindow
} = require('electron');
const path = require('path');
const fs = require('fs')
const cp = require('child_process')
const {
    width,
    height
} = require("screenz");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

try {
    fs.unlinkSync('./temp/temp.mp4')
} catch (error) {}

try {
    fs.readdirSync('./downloads')
    fs.readdirSync('./temp')
} catch (error) {
    try {
        fs.mkdirSync('./downloads')
    } catch (error) {}
    try {
        fs.mkdirSync('./temp')
    } catch (error) {}
}

let dev

try {
    if (fs.readFileSync('./.devmode') == "true") {
        dev = true
    } else {
        dev = false
    }
} catch (error) {
    dev = false
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: width / 2.5,
        height: height / 2,
        minWidth: 290,
        minHeight: 160,
        transparent: true,
        frame: false,
        resizable: true,
        webPreferences: {
            devTools: dev,
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