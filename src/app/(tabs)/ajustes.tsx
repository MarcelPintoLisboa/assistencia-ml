import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, Card, Titulo } from '../../components/ui';
import { prepararNotificacoes } from '../../lib/notifications';
import { useDados } from '../../lib/store';
import { colors, radius } from '../../theme';

function confirmar(titulo: string, msg: string, acao: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${titulo}\n\n${msg}`)) acao();
    return;
  }
  Alert.alert(titulo, msg, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Confirmar', style: 'destructive', onPress: acao },
  ]);
}

export default function Ajustes() {
  const insets = useSafeAreaInsets();
  const { clientes, ordens, agendamentos, carregarExemplo, apagarTudo } = useDados();

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 40 }}>
      <Text style={st.h1}>Ajustes</Text>

      <View style={st.banner}>
        <Image source={require('../../../assets/marca.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['transparent', 'rgba(5,11,26,0.9)']} style={StyleSheet.absoluteFill} />
        <Text style={st.bannerTitulo}>Assistência ML</Text>
        <Text style={st.bannerSub}>Controle completo da sua assistência técnica</Text>
      </View>

      <Titulo>Seus dados</Titulo>
      <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <Num n={ordens.length} label="Ordens" />
        <Num n={clientes.length} label="Clientes" />
        <Num n={agendamentos.length} label="Agendamentos" />
      </Card>
      <Text style={st.nota}>Os dados ficam salvos neste aparelho.</Text>

      <Titulo>Lembretes</Titulo>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.textSec, flex: 1, lineHeight: 20 }}>
            O app avisa antes de cada agendamento (no horário que você escolher) e às 8h do dia da previsão de entrega
            de cada OS.
          </Text>
        </View>
        <Botao
          label="Permitir notificações"
          variante="secundario"
          icon="notifications"
          onPress={async () => {
            const ok = await prepararNotificacoes();
            Alert.alert(ok ? 'Tudo certo!' : 'Notificações bloqueadas', ok ? 'Os lembretes estão ativos.' : 'Ative as notificações do app nas configurações do aparelho.');
          }}
        />
      </Card>

      <Titulo>Dados de exemplo</Titulo>
      <Card style={{ gap: 10 }}>
        <Botao
          label="Carregar dados de exemplo"
          variante="secundario"
          icon="sparkles-outline"
          onPress={() => confirmar('Carregar exemplo', 'Isso substitui todos os dados atuais por dados fictícios.', carregarExemplo)}
        />
        <Botao
          label="Apagar todos os dados"
          variante="perigo"
          icon="trash-outline"
          onPress={() => confirmar('Apagar tudo', 'Todos os clientes, ordens e agendamentos serão removidos. Não é possível desfazer.', apagarTudo)}
        />
      </Card>

      <Text style={[st.nota, { textAlign: 'center', marginTop: 24 }]}>
        Versão {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </ScrollView>
  );
}

function Num({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 24, fontWeight: '800' }}>{n}</Text>
      <Text style={{ color: colors.textSec, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  banner: { height: 150, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', padding: 16 },
  bannerTitulo: { color: colors.text, fontSize: 22, fontWeight: '800' },
  bannerSub: { color: colors.textSec, fontSize: 13 },
  nota: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
});
