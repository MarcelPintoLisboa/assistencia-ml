import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export const A4 = { width: 595, height: 842 };

type Tamanho = { width: number; height: number };

const avisar = (msg: string) => (Platform.OS === 'web' ? globalThis.alert?.(msg) : Alert.alert('Ops', msg));

/** Abre a janela de impressão do sistema (impressoras Wi-Fi, Bluetooth compatíveis, AirPrint, Mopria…). */
export async function imprimir(html: string, tamanho: Tamanho = A4) {
  try {
    await Print.printAsync({ html, ...tamanho });
  } catch (e) {
    if (!String(e).toLowerCase().includes('cancel')) avisar('Não foi possível imprimir.');
  }
}

/** Gera um PDF e abre o compartilhamento (WhatsApp, e-mail, app da impressora de etiquetas…). */
export async function compartilharPdf(html: string, titulo: string, tamanho: Tamanho = A4) {
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
