import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useConta } from '../lib/conta';
import { mensagemErro } from '../lib/supabase';
import { colors } from '../theme';
import { Botao } from './ui';

// Telas entre o login e o app: convite pendente, acesso desativado ou erro ao ler a conta.
export function EstadoConta() {
  const { sair } = useAuth();
  const { erro, convite, email, aceitarConvite, recusarConvite, recarregarConta } = useConta();
  const [ocupado, setOcupado] = useState(false);

  const fazer = async (fn: () => Promise<void>) => {
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Não foi possível concluir', mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  };

  let icone: keyof typeof Ionicons.glyphMap = 'cloud-offline';
  let titulo = 'Sem conexão';
  let texto = mensagemErro(erro);
  if (!erro && convite) {
    icone = 'people';
    titulo = 'Convite para a equipe';
    texto =
      `O administrador de ${convite.loja || 'uma loja'} cadastrou ${email} como ` +
      `${convite.admin ? 'administrador' : 'usuário'}. Ao aceitar, você passa a usar os dados dessa loja.`;
  } else if (!erro) {
    icone = 'lock-closed';
    titulo = 'Acesso desativado';
    texto = 'Seu acesso foi desativado pelo administrador da loja. Fale com ele para reativar.';
  }

  return (
    <View style={st.tela}>
      <View style={st.icone}>
        <Ionicons name={icone} size={40} color={colors.primary} />
      </View>
      <Text style={st.titulo}>{titulo}</Text>
      <Text style={st.texto}>{texto}</Text>
      {ocupado ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 24 }}>
          {!erro && convite ? (
            <>
              <Botao label="Aceitar e entrar" icon="checkmark" onPress={() => fazer(aceitarConvite)} />
              <Botao label="Recusar convite" variante="secundario" icon="close" onPress={() => fazer(recusarConvite)} />
            </>
          ) : (
            <Botao label="Tentar de novo" icon="refresh" onPress={() => fazer(recarregarConta)} />
          )}
          <Botao label="Sair da conta" variante="secundario" icon="log-out-outline" onPress={sair} />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  icone: {
    width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary + '18', marginBottom: 16,
  },
  titulo: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  texto: { color: colors.textSec, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});
