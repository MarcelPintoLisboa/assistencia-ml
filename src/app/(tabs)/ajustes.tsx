import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { celularFormatado, CONTATO, LINKS } from '../../lib/contato';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OpcaoBiometria } from '../../components/OpcaoBiometria';
import { Botao, Card, Titulo } from '../../components/ui';
import { prepararNotificacoes } from '../../lib/notifications';
import { useConta } from '../../lib/conta';
import { useDesktop } from '../../lib/desktop';
import { useDados } from '../../lib/store';
import { useAuth } from '../../lib/auth';
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
  const desktop = useDesktop();
  const m = desktop ? 28 : 16;
  const { clientes, ordens, agendamentos, loja, ehAdmin } = useDados();
  const { user, sair } = useAuth();
  const { equipeDisponivel, ehAdminGeral, empresa } = useConta();

  return (
    <ScrollView contentContainerStyle={{ paddingTop: desktop ? 24 : insets.top + 12, paddingHorizontal: m, paddingBottom: 40, ...(desktop && { maxWidth: 900 }) }}>
      <Text style={st.h1}>Menu</Text>

      <View style={st.banner}>
        <Image source={require('../../../assets/marca.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['transparent', 'rgba(5,11,26,0.9)']} style={StyleSheet.absoluteFill} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {loja.logo && (
            <View style={st.bannerLogo}>
              <Image source={{ uri: loja.logo }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={st.bannerTitulo} numberOfLines={2}>{loja.nome || 'Assistência ML'}</Text>
            <Text style={st.bannerSub}>Assistência técnica de drones e video games</Text>
          </View>
        </View>
      </View>

      <Titulo>Contatos</Titulo>
      <Card style={{ paddingVertical: 4 }}>
        <View style={st.perfil}>
          <Image
            source={require('../../../assets/perfil.png')}
            style={st.foto}
            contentFit="cover"
            contentPosition={{ top: '20%' }}
            accessibilityLabel="Foto de Marcel Lisboa"
          />
          <View style={{ flex: 1 }}>
            <Text style={st.perfilNome}>Marcel Lisboa</Text>
            <Text style={st.perfilCargo}>Técnico responsável · Drones & Video Games</Text>
          </View>
        </View>
        <ItemContato borda icon="logo-instagram" cor="#E1306C" titulo="Instagram" valor={`@${CONTATO.instagram}`} url={LINKS.instagram} />
        <ItemContato icon="logo-whatsapp" cor="#25D366" titulo="WhatsApp" valor={celularFormatado()} url={LINKS.whatsapp} borda />
        <ItemContato icon="call" cor={colors.primary} titulo="Celular" valor={celularFormatado()} url={LINKS.telefone} borda />
        <ItemContato icon="mail" cor="#60A5FA" titulo="E-mail" valor={CONTATO.email} url={LINKS.email} borda />
      </Card>

      <Titulo>Gestão</Titulo>
      <Card style={{ paddingVertical: 4 }}>
        <ItemMenu icon="people-outline" titulo="Clientes" desc={`${clientes.length} cadastrados`} onPress={() => router.push('/clientes')} />
        {ehAdmin && (
          <>
            <ItemMenu icon="stats-chart-outline" titulo="Indicadores de vendas" desc="Faturamento, lucro e mais vendidos" onPress={() => router.push('/admin')} borda />
            <ItemMenu icon="pricetags-outline" titulo="Modelos de etiqueta" desc="Imagem de fundo, cores e tamanho" onPress={() => router.push('/etiquetas')} borda />
          </>
        )}
      </Card>

      {ehAdmin && (
        <>
          <Titulo>Configurações (administrador)</Titulo>
          <Card style={{ paddingVertical: 4 }}>
            <ItemMenu icon="business-outline" titulo="Empresa: nome e logo" desc="Vale para documentos, relatórios e etiquetas" onPress={() => router.push('/loja')} />
            <ItemMenu
              icon="person-add-outline"
              titulo="Usuários da empresa"
              desc={equipeDisponivel ? 'Adicionar e remover usuários da sua empresa' : 'Requer o script de equipe no Supabase'}
              onPress={() => router.push('/usuarios')}
              borda
            />
            {ehAdminGeral && (
              <ItemMenu
                icon="business"
                titulo="Empresas e acessos"
                desc="Criar nova empresa e liberar acessos (admin geral)"
                onPress={() => router.push('/acessos')}
                borda
              />
            )}
          </Card>
        </>
      )}

      <Titulo>Seus dados</Titulo>
      <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <Num n={ordens.length} label="Ordens" />
        <Num n={clientes.length} label="Clientes" />
        <Num n={agendamentos.length} label="Agendamentos" />
      </Card>

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

      <OpcaoBiometria />

      <Titulo>Conta</Titulo>
      <Card style={{ gap: 10 }}>
        <Text style={{ color: colors.textSec, fontSize: 12 }}>Conectado como</Text>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{user?.email}</Text>
        <Text style={{ color: ehAdmin ? colors.primary : colors.textSec, fontWeight: '700' }}>
          {ehAdminGeral ? 'Administrador geral' : ehAdmin ? 'Administrador' : 'Usuário'}
          {empresa ? ` · ${empresa}` : ''}
        </Text>
        <Botao label="Trocar senha" variante="secundario" icon="key-outline" onPress={() => router.push('/senha')} />
        <Text style={st.nota}>
          Seus dados ficam salvos na nuvem. Entre com a mesma conta em outro aparelho para ver os mesmos clientes, ordens e vendas.
        </Text>
        <Botao
          label="Sair da conta"
          variante="perigo"
          icon="log-out-outline"
          onPress={() => confirmar('Sair da conta', 'Seus dados continuam salvos na nuvem. Para ver de novo, é só entrar.', sair)}
        />
      </Card>

      <Text style={[st.nota, { textAlign: 'center', marginTop: 24 }]}>
        Versão {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </ScrollView>
  );
}

function ItemMenu({ icon, titulo, desc, onPress, borda }: { icon: keyof typeof Ionicons.glyphMap; titulo: string; desc: string; onPress: () => void; borda?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.contato, borda && st.contatoBorda, pressed && { opacity: 0.7 }]}>
      <View style={[st.contatoIcone, { backgroundColor: colors.primary + '18' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{titulo}</Text>
        <Text style={{ color: colors.textSec, fontSize: 12 }}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function ItemContato({
  icon, cor, titulo, valor, url, borda,
}: {
  icon: keyof typeof Ionicons.glyphMap; cor: string; titulo: string; valor: string; url: string; borda?: boolean;
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [st.contato, borda && st.contatoBorda, pressed && { opacity: 0.7 }]}
      accessibilityLabel={`${titulo}: ${valor}`}
    >
      <View style={[st.contatoIcone, { backgroundColor: cor + '22' }]}>
        <Ionicons name={icon} size={20} color={cor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textSec, fontSize: 12 }}>{titulo}</Text>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{valor}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color={colors.textMuted} />
    </Pressable>
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
  bannerLogo: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#fff', padding: 4, overflow: 'hidden' },
  bannerTitulo: { color: colors.text, fontSize: 22, fontWeight: '800' },
  bannerSub: { color: colors.textSec, fontSize: 13 },
  nota: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  foto: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.primary },
  perfilNome: { color: colors.text, fontSize: 18, fontWeight: '800' },
  perfilCargo: { color: colors.textSec, fontSize: 13, marginTop: 2 },
  contato: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  contatoBorda: { borderTopWidth: 1, borderTopColor: colors.border },
  contatoIcone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
