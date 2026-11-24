import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { type Href, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useConta } from '../lib/conta';
import { emHover, LARGURA_MENU } from '../lib/desktop';
import { useDados } from '../lib/store';
import { colors, radius } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

type Item = {
  rotulo: string;
  icone: IconName;
  href: Href;
  /** prefixos de rota que deixam o item marcado */
  ativoEm: string[];
  badge?: number;
};

// Menu lateral do layout desktop: substitui as abas de baixo e o "Menu" do celular.
export function MenuLateral() {
  const caminho = usePathname();
  const { sair } = useAuth();
  const { ehAdmin, ehAdminGeral, email } = useConta();
  const { loja, agendamentos, ordens } = useDados();

  const hoje = new Date().toDateString();
  const agendaHoje = agendamentos.filter((a) => !a.concluido && new Date(a.data).toDateString() === hoje).length;
  const prontas = ordens.filter((o) => o.status === 'pronto').length;

  const principais: Item[] = [
    { rotulo: 'Painel', icone: 'speedometer-outline', href: '/', ativoEm: ['/'] },
    { rotulo: 'Ordens de serviço', icone: 'construct-outline', href: '/ordens', ativoEm: ['/ordens', '/ordem'], badge: prontas },
    { rotulo: 'Vendas', icone: 'cart-outline', href: '/vendas', ativoEm: ['/vendas', '/venda'] },
    { rotulo: 'Produtos', icone: 'cube-outline', href: '/produtos', ativoEm: ['/produtos'] },
    { rotulo: 'Agenda', icone: 'calendar-outline', href: '/agenda', ativoEm: ['/agenda', '/agendamento'], badge: agendaHoje },
    { rotulo: 'Clientes', icone: 'people-outline', href: '/clientes', ativoEm: ['/clientes', '/cliente'] },
  ];
  const gestao: Item[] = ehAdmin
    ? [
        { rotulo: 'Indicadores', icone: 'stats-chart-outline', href: '/admin', ativoEm: ['/admin'] },
        { rotulo: 'Etiquetas', icone: 'pricetags-outline', href: '/etiquetas', ativoEm: ['/etiquetas', '/etiqueta'] },
        { rotulo: 'Empresa', icone: 'business-outline', href: '/loja', ativoEm: ['/loja'] },
        { rotulo: 'Usuários', icone: 'person-add-outline', href: '/usuarios', ativoEm: ['/usuarios'] },
        ...(ehAdminGeral
          ? [{ rotulo: 'Empresas e acessos', icone: 'key-outline' as IconName, href: '/acessos' as Href, ativoEm: ['/acessos'] }]
          : []),
      ]
    : [];

  const ativo = (i: Item) => i.ativoEm.some((p) => (p === '/' ? caminho === '/' : caminho.startsWith(p)));

  // Atalhos de teclado do desktop
  useEffect(() => {
    const doc = globalThis.document;
    if (!doc) return;
    const ir: Record<string, Href> = { F2: '/ordem/nova', F3: '/venda/nova', F4: '/cliente/novo', F6: '/agendamento/novo' };
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || !ir[e.key]) return;
      e.preventDefault();
      router.push(ir[e.key]);
    };
    doc.addEventListener('keydown', tecla);
    return () => doc.removeEventListener('keydown', tecla);
  }, []);

  const confirmarSaida = () =>
    Alert.alert('Sair da conta', 'Seus dados continuam salvos na nuvem.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);

  return (
    <View style={st.menu}>
      <View style={st.marca}>
        {loja.logo ? (
          <View style={[st.logo, { backgroundColor: '#fff', padding: 2 }]}>
            <Image source={{ uri: loja.logo }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
          </View>
        ) : (
          <View style={st.logo}>
            <Ionicons name="build" size={18} color={colors.bg} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={st.nome} numberOfLines={1}>{loja.nome || 'Assistência ML'}</Text>
          <Text style={st.sub}>Drones & Video Games</Text>
        </View>
      </View>

      <View style={st.rapidas}>
        <Pressable style={(e) => [st.btnNovo, emHover(e) && { opacity: 0.9 }]} onPress={() => router.push('/ordem/nova')}>
          <Ionicons name="add" size={18} color={colors.bg} />
          <Text style={st.btnNovoTxt}>Nova OS</Text>
        </Pressable>
        <Pressable style={(e) => [st.btnVenda, emHover(e) && { backgroundColor: colors.bgAlt }]} onPress={() => router.push('/venda/nova')}>
          <Ionicons name="cart" size={16} color={colors.primary} />
          <Text style={st.btnVendaTxt}>Venda</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
        {principais.map((i) => (
          <ItemMenu key={i.rotulo} item={i} ativo={ativo(i)} />
        ))}
        {gestao.length > 0 && <Text style={st.secao}>Administração</Text>}
        {gestao.map((i) => (
          <ItemMenu key={i.rotulo} item={i} ativo={ativo(i)} />
        ))}
        <Text style={st.secao}>Sistema</Text>
        <ItemMenu item={{ rotulo: 'Configurações', icone: 'settings-outline', href: '/ajustes', ativoEm: ['/ajustes', '/senha'] }} ativo={caminho.startsWith('/ajustes')} />
        <Text style={st.atalhos}>
          Atalhos: F2 nova OS · F3 nova venda · F4 novo cliente · F6 agendar
        </Text>
      </ScrollView>

      <View style={st.conta}>
        <View style={st.avatar}>
          <Ionicons name={ehAdmin ? 'shield-checkmark' : 'person'} size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.email} numberOfLines={1}>{email}</Text>
          <Text style={st.papel}>
            {ehAdminGeral ? 'Administrador geral' : ehAdmin ? 'Administrador' : 'Usuário'} · v{Constants.expoConfig?.version}
          </Text>
        </View>
        <Pressable onPress={confirmarSaida} hitSlop={8} accessibilityLabel="Sair">
          <Ionicons name="log-out-outline" size={20} color={colors.textSec} />
        </Pressable>
      </View>
    </View>
  );
}

function ItemMenu({ item, ativo }: { item: Item; ativo: boolean }) {
  return (
    <Pressable
      onPress={() => router.navigate(item.href)}
      style={(e) => [st.item, ativo ? st.itemAtivo : emHover(e) && st.itemHover]}
    >
      <Ionicons name={item.icone} size={19} color={ativo ? colors.primary : colors.textSec} />
      <Text style={[st.itemTxt, ativo && { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
        {item.rotulo}
      </Text>
      {!!item.badge && (
        <View style={st.badge}>
          <Text style={st.badgeTxt}>{item.badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  menu: { width: LARGURA_MENU, backgroundColor: colors.bgAlt, borderRightWidth: 1, borderRightColor: colors.border, paddingTop: 18 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  logo: {
    width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden',
  },
  nome: { color: colors.text, fontWeight: '800', fontSize: 15 },
  sub: { color: colors.textMuted, fontSize: 11 },
  rapidas: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 14 },
  btnNovo: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10,
    borderRadius: radius.md, backgroundColor: colors.primary,
  },
  btnNovoTxt: { color: colors.bg, fontWeight: '800' },
  btnVenda: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  btnVendaTxt: { color: colors.primary, fontWeight: '700' },
  secao: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 4, paddingHorizontal: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 12, marginHorizontal: 8, borderRadius: radius.md },
  itemAtivo: { backgroundColor: colors.primary + '1F' },
  itemHover: { backgroundColor: colors.card },
  itemTxt: { color: colors.textSec, fontSize: 14, flex: 1 },
  badge: { minWidth: 20, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { color: colors.bg, fontSize: 11, fontWeight: '800' },
  atalhos: { color: colors.textMuted, fontSize: 11, lineHeight: 16, paddingHorizontal: 20, marginTop: 14 },
  conta: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  email: { color: colors.text, fontSize: 12, fontWeight: '600' },
  papel: { color: colors.textMuted, fontSize: 11 },
});
