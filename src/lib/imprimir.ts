import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export const A4 = { width: 595, height: 842 };

type Tamanho = { width: number; height: number };

/** Recursos do app desktop (Electron), expostos pelo desktop/preload.js. */
type Desktop = {
  imprimir: (html: string, tamanho: Tamanho) => Promise<void>;
  salvarPdf: (html: string, titulo: string, tamanho: Tamanho) => Promise<boolean>;
};
const desktop = (globalThis as { desktop?: Desktop }).desktop;

/** true quando roda no app desktop (Windows) */
export const ehDesktop = !!desktop;

const avisar = (msg: string) => Alert.alert('Ops', msg);

/** No navegador: imprime só o documento, por um iframe escondido (o expo-print imprimiria a tela toda). */
function imprimirNoNavegador(html: string) {
  const doc = globalThis.document;
  const f = doc.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  doc.body.appendChild(f);
  const w = f.contentWindow!;
  w.document.open();
  w.document.write(html);
  w.document.close();
  const ir = () => {
    w.focus();
    w.print();
    setTimeout(() => f.remove(), 1000);
  };
  // espera imagens (logo) carregarem
  if (w.document.readyState === 'complete') setTimeout(ir, 300);
  else w.addEventListener('load', () => setTimeout(ir, 100));
}

/** Abre a janela de impressão do sistema (impressoras Wi-Fi, Bluetooth compatíveis, AirPrint, Mopria…). */
export async function imprimir(html: string, tamanho: Tamanho = A4) {
  try {
    if (desktop) return await desktop.imprimir(html, tamanho);
    if (Platform.OS === 'web') return imprimirNoNavegador(html);
    await Print.printAsync({ html, ...tamanho });
  } catch (e) {
    if (!String(e).toLowerCase().includes('cancel')) avisar('Não foi possível imprimir.');
  }
}

/** Gera um PDF e abre o compartilhamento (WhatsApp, e-mail, app da impressora de etiquetas…). No desktop, salva o arquivo. */
export async function compartilharPdf(html: string, titulo: string, tamanho: Tamanho = A4) {
  if (desktop) {
    try {
      if (await desktop.salvarPdf(html, titulo, tamanho)) Alert.alert('PDF salvo', 'O arquivo foi salvo e aberto.');
    } catch {
      avisar('Não foi possível gerar o PDF.');
    }
    return;
  }
  if (Platform.OS === 'web') return imprimir(html, tamanho);
  try {
    const { uri } = await Print.printToFileAsync({ html, ...tamanho });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: titulo, UTI: 'com.adobe.pdf' });
    } else {
      avisar('Compartilhamento indisponível neste aparelho.');
    }
  } catch {
    avisar('Não foi possível gerar o PDF.');
  }
}
