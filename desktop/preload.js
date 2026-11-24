// Ponte segura entre a tela (app web) e o Electron: só impressão e PDF.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  imprimir: (html, tamanho) => ipcRenderer.invoke('imprimir', html, tamanho),
  salvarPdf: (html, titulo, tamanho) => ipcRenderer.invoke('salvar-pdf', html, titulo, tamanho),
});
