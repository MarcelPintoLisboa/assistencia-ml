import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Abre a galeria e devolve a imagem como data URI (base64), já reduzida
 * para não pesar no armazenamento nem nos PDFs.
 */
export async function escolherImagem(larguraMax = 600, png = false): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, base64: true });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  try {
    const ctx = ImageManipulator.manipulate(a.uri);
    if ((a.width ?? 0) > larguraMax) ctx.resize({ width: larguraMax });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ base64: true, compress: 0.7, format: png ? SaveFormat.PNG : SaveFormat.JPEG });
    if (out.base64) return `data:image/${png ? 'png' : 'jpeg'};base64,${out.base64}`;
  } catch {
    // cai para a imagem original
  }
  return a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : null;
}
