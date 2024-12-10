/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }
  
    for (const type of ['chrome', 'node', 'electron']) {
      replaceText(`${type}-version`, process.versions[type])
    }
  }
)

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld("fileApi", {
    selectAndUpload: async () => {
      const filePath = await ipcRenderer.invoke("file-select");
      return ipcRenderer.invoke("file-upload", {filePath});
    },
    getServerUrl: () => {
      return ipcRenderer.invoke("get-server-url");
    },
    saveFile: async (fileName, blobData) => {
      const filePath = await ipcRenderer.invoke("file-save", {fileName});
      return await ipcRenderer.invoke("blob-to-file", {filepath: filePath, blobData: blobData});
    }
});

contextBridge.exposeInMainWorld('nodeAPI', {
  Buffer: (data, encoding) => Buffer.from(data, encoding), // Buffer 노출
});