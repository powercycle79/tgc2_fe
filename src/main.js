// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')
const path = require('node:path')

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 1000,
    webPreferences: {
      //webSecurity: true,
      //nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
  })

  // and load the index.html of the app.
  mainWindow.loadFile('src/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// IPC
const {ipcMain, dialog} = require('electron')
const fs = require('fs')

const defaultPath = 'C:\\Midas\\Test Model';
ipcMain.handle('file-select', async () => {
    const fileSelected = dialog.showOpenDialogSync({ defaultPath, properties: ['openFile'], 
      filters: [
        { name: 'Civil Model', extensions: ['mcb'] },
        { name: 'All Files', extensions: ['*'] }
      ] });

    if(fileSelected.length > 0) {
        const selected = fileSelected[0];
        return selected;
    }
    return undefined;
});

const {basename} = require("node:path");
const serverUrl = "http://localhost:8080";
ipcMain.handle('get-server-url', () => serverUrl);

ipcMain.handle('file-upload', async (event, args) => {
    const {filePath} = args;

    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      const fileName = basename(filePath);

      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
      formData.append('file', blob, fileName);

      const response = await fetch(`${serverUrl}/file/upload-mcb`, {
          method: 'POST',
          headers: {
              'Accept': '*/*'
          },
          body: formData
      });

      return await response.json();
  } catch (error) {
      console.error('Upload error:', error);
      throw error;
  }
});

ipcMain.handle('file-save', async (event, args) => {
  const {fileName} = args;
  const fileNameExt = fileName;
  const defaultPathName = path.join(defaultPath, fileNameExt);
  const fileSave = dialog.showSaveDialogSync({ defaultPath: defaultPathName, properties: ['openFile' | 'createDirectory' | 'showOverwriteConfirmation'],
    filters: [
      { name: 'zip File', extensions: ['zip'] }
    ] });

    if(fileSave.length > 0) {
        const selected = fileSave;
        return selected;
    }
    return undefined;
});

ipcMain.handle('blob-to-file', async (event, {filepath, blobData}) => {
  try {
    const buffer = Buffer.from(blobData);
    fs.writeFileSync(filepath, buffer);
    return { success: true };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, error: error.message };
  }
});