// Entrada com Face ID / digital: trava o app (com a sessão já salva) até a pessoa se identificar.
// É opcional e vale por aparelho (escolhida em Ajustes). A senha nunca fica guardada no aparelho.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

const CHAVE = 'assistencia.biometria';

/** Só existe no celular (Android / iOS). */
export const biometriaSuportada = Platform.OS === 'ios' || Platform.OS === 'android';

export async function infoBiometria(): Promise<{ disponivel: boolean; nome: string }> {
  if (!biometriaSuportada) return { disponivel: false, nome: 'biometria' };
  try {
    const [hardware, cadastrada, tipos] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const rosto = tipos.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const digital = tipos.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const nome =
      Platform.OS === 'ios' ? (rosto ? 'Face ID' : 'Touch ID') : digital ? 'digital' : rosto ? 'reconhecimento facial' : 'biometria';
    return { disponivel: hardware && cadastrada, nome };
  } catch {
    return { disponivel: false, nome: 'biometria' };
  }
}

export async function biometriaAtiva(): Promise<boolean> {
  if (!biometriaSuportada) return false;
  try {
    return (await AsyncStorage.getItem(CHAVE)) === '1';
  } catch {
    return false;
  }
}

export async function definirBiometria(ativa: boolean) {
  try {
    if (ativa) await AsyncStorage.setItem(CHAVE, '1');
    else await AsyncStorage.removeItem(CHAVE);
  } catch {
    // sem armazenamento: fica desligada
  }
}

export async function autenticar(mensagem = 'Entrar no Assistência ML'): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: mensagem, cancelLabel: 'Cancelar' });
    return r.success;
  } catch {
    return false;
  }
}

// Quem acabou de digitar a senha não precisa da biometria logo em seguida.
let entrouComSenha = false;
export const marcarEntradaComSenha = () => {
  entrouComSenha = true;
};
export const consumirEntradaComSenha = () => {
  const v = entrouComSenha;
  entrouComSenha = false;
  return v;
};
