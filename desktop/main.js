// Assistência ML — versão desktop (Electron).
// Empacota a versão web do app (gerada por `expo export --platform web` em desktop/app)
// e serve os arquivos por um protocolo próprio (app://), com impressão e PDF nativos.
const { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const PASTA_APP = path.join(__dirname, 'app');
const INICIO = 'app://local/';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

const DEBUG = process.env.ASSISTENCIA_DEBUG;
// diagnóstico roda com dados separados, sem conflitar com o app aberto
if (DEBUG) app.setPath('userData', path.join(app.getPath('temp'), 'assistencia-ml-debug'));
const logDebug = (m) => DEBUG && fs.appendFileSync(`${DEBUG}.log`, `${new Date().toISOString()} ${m}\n`);
process.on('uncaughtException', (e) => logDebug('[erro] ' + (e && e.stack)));
logDebug('[main] iniciando ' + process.versions.electron);

// O Electron põe o nome do app ("Assistência ML") no User-Agent. O "ê" fora do padrão ASCII faz
// o Supabase falhar ao gravar a sessão no login ("Database error granting user").
// Identificação só com caracteres simples:
app.userAgentFallback = app.userAgentFallback
  .replace(/Assist\S*ML\/[\d.]+/g, `AssistenciaML/${app.getVersion()}`)
  .replace(/[^\x20-\x7E]/g, '');

// Uma janela só: abrir o atalho de novo traz a janela existente para frente
const unica = app.requestSingleInstanceLock();
logDebug('[main] instancia unica: ' + unica);
if (!unica) app.quit();

let janela = null;

function criarJanela() {
  janela = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#050B1A',
    title: 'Assistência ML',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });
  janela.once('ready-to-show', () => janela.show());
  // barras de rolagem finas e escuras, no tema do app (as do Windows são brancas)
  janela.webContents.on('did-finish-load', () => {
    janela.webContents.insertCSS(`
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #1E2A44; border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
      ::-webkit-scrollbar-thumb:hover { background: #2B3B5E; background-clip: padding-box; }
      ::-webkit-scrollbar-corner { background: transparent; }
    `);
  });

  // Links externos (WhatsApp, Instagram, e-mail, telefone) abrem no navegador / app padrão
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('app://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  janela.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  janela.loadURL(INICIO);

  // Diagnóstico: ASSISTENCIA_DEBUG=<arquivo.png> registra o console e salva um print da tela após 10 s
  const debug = DEBUG;
  if (debug) {
    const log = logDebug;
    log('[janela] criada');
    janela.webContents.on('console-message', (e) => log(`[tela] ${e.level}: ${e.message}`));
    janela.webContents.on('did-fail-load', (_e, cod, desc, url) => log(`[falha] ${cod} ${desc} ${url}`));
    janela.webContents.once('did-finish-load', () => {
      log('[carregou] ' + janela.webContents.getURL());
      // ASSISTENCIA_DEBUG_JS: código executado na tela (ex.: testar a conexão com o Supabase)
      if (process.env.ASSISTENCIA_DEBUG_JS) {
        janela.webContents
          .executeJavaScript(process.env.ASSISTENCIA_DEBUG_JS)
          .then((r) => log('[js] ' + JSON.stringify(r)))
          .catch((e) => log('[js erro] ' + e));
      }
      setTimeout(async () => {
        const img = await janela.webContents.capturePage();
        fs.writeFileSync(debug, img.toPNG());
        log('[print salvo]');
        app.quit();
      }, process.env.ASSISTENCIA_DEBUG_JS ? 15000 : 5000);
    });
  }
}

// Página temporária com o documento para imprimir ou gerar PDF
async function janelaDoDocumento(html) {
  const arq = path.join(os.tmpdir(), `assistencia-ml-${Date.now()}.html`);
  fs.writeFileSync(arq, html, 'utf8');
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  await w.loadFile(arq);
  // dá tempo para imagens (logo) carregarem
  await new Promise((r) => setTimeout(r, 300));
  return {
    w,
    fechar: () => {
      if (!w.isDestroyed()) w.destroy();
      fs.rm(arq, () => {});
    },
  };
}

// tamanho em pontos (72 por polegada) → mícrons, como o Electron espera
const paraMicrons = (pt) => Math.round((pt * 25400) / 72);
const tamanhoPagina = (t) =>
  t && t.width && t.height ? { width: paraMicrons(t.width), height: paraMicrons(t.height) } : 'A4';

ipcMain.handle('imprimir', async (_e, html, tamanho) => {
  const { w, fechar } = await janelaDoDocumento(html);
  try {
    await new Promise((resolve, reject) => {
      w.webContents.print({ printBackground: true, pageSize: tamanhoPagina(tamanho), margins: { marginType: 'none' } }, (ok, motivo) => {
        if (ok || motivo === 'cancelled' || motivo === 'Print job canceled') resolve();
        else reject(new Error(motivo || 'falha ao imprimir'));
      });
    });
  } finally {
    fechar();
  }
});

ipcMain.handle('salvar-pdf', async (_e, html, titulo, tamanho) => {
  const nome = String(titulo || 'documento').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'documento';
  const { canceled, filePath } = await dialog.showSaveDialog(janela, {
    title: 'Salvar PDF',
    defaultPath: path.join(app.getPath('documents'), `${nome}.pdf`),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return false;
  const { w, fechar } = await janelaDoDocumento(html);
  try {
    // printToPDF usa polegadas (o print usa mícrons)
    const pageSize = tamanho && tamanho.width && tamanho.height ? { width: tamanho.width / 72, height: tamanho.height / 72 } : 'A4';
    const pdf = await w.webContents.printToPDF({ printBackground: true, pageSize, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    fs.writeFileSync(filePath, pdf);
    shell.openPath(filePath);
    return true;
  } finally {
    fechar();
  }
});

app.on('second-instance', () => {
  if (!janela) return;
  if (janela.isMinimized()) janela.restore();
  janela.focus();
});

app.whenReady().then(() => {
  if (!unica) return;
  Menu.setApplicationMenu(null);

  // Serve desktop/app. Rotas do app (ex.: /ordem/123) caem no index.html.
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    let arq = path.normalize(path.join(PASTA_APP, decodeURIComponent(pathname)));
    if (!arq.startsWith(PASTA_APP)) return new Response('Proibido', { status: 403 });
    if (!fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
      const html = arq + '.html';
      arq = fs.existsSync(html) ? html : path.join(PASTA_APP, 'index.html');
    }
    return net.fetch(pathToFileURL(arq).toString());
  });

  criarJanela();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
