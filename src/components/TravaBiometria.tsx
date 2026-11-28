import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { autenticar, biometriaAtiva, biometriaSuportada, consumirEntradaComSenha, infoBiometria } from '../lib/biometria';
import { colors, radius } from '../theme';

/** Tempo em segundo plano depois do qual o app pede a biometria de novo. */
const VOLTA_MS = 60_000;

/**
 * Com a entrada por biometria ligada em Ajustes, cobre o app até a pessoa se identificar —
 * ao abrir e ao voltar depois de 1 minuto fora. O app continua carregando por baixo.
 */
export function TravaBiometria({ children }: { children: React.ReactNode }) {
  const { sair } = useAuth();
  const [travado, setTravado] = useState(false);
  const [nome, setNome] = useState('biometria');
  const saiuEm = useRef<number | null>(null);
  const pedindo = useRef(false);

  const desbloquear = useCallback(async () => {
    if (pedindo.current) return;
    pedindo.current = true;
    const ok = await autenticar();
    pedindo.current = false;
    if (ok) setTravado(false);
  }, []);

  const travarSeAtiva = useCallback(async () => {
    if (!(await biometriaAtiva())) return;
    const info = await infoBiometria();
    // biometria removida do aparelho: não prende a pessoa fora do app
    if (!info.disponivel) return;
    setNome(info.nome);
    setTravado(true);
    desbloquear();
  }, [desbloquear]);

  useEffect(() => {
    if (!biometriaSuportada) return;
    // verifica logo depois de montar (em callback, fora do corpo do efeito)
    const inicio = setTimeout(() => {
      if (!consumirEntradaComSenha()) travarSeAtiva();
    }, 0);
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') saiuEm.current = Date.now();
      if (estado === 'active' && saiuEm.current && Date.now() - saiuEm.current > VOLTA_MS) {
        saiuEm.current = null;
        travarSeAtiva();
      }
    });
    return () => {
      clearTimeout(inicio);
      sub.remove();
    };
  }, [travarSeAtiva]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {travado && (
        <View style={[StyleSheet.absoluteFill, st.tela]}>
          <View style={st.icone}>
            <Ionicons name={nome === 'Face ID' || nome === 'reconhecimento facial' ? 'scan-outline' : 'finger-print'} size={48} color={colors.primary} />
          </View>
          <Text style={st.titulo}>App bloqueado</Text>
          <Text style={st.texto}>Use {nome === 'digital' ? 'sua digital' : nome === 'biometria' ? 'a biometria' : `o ${nome}`} para entrar.</Text>
          <Pressable onPress={desbloquear} style={({ pressed }) => [st.botao, pressed && { opacity: 0.8 }]}>
            <Text style={st.botaoTxt}>Desbloquear</Text>
          </Pressable>
          <Pressable onPress={sair} style={{ marginTop: 18, padding: 8 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Entrar com e-mail e senha</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  tela: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000, elevation: 1000 },
  icone: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center' },
  titulo: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 18 },
  texto: { color: colors.textSec, marginTop: 6, textAlign: 'center' },
  botao: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 40, marginTop: 26 },
  botaoTxt: { color: colors.bg, fontWeight: '800', fontSize: 16 },
});
