import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { OrdemItem } from '../../components/Itens';
import { Botao, Card, Linha, Titulo, Vazio } from '../../components/ui';
import { fmtData, fmtMoeda } from '../../lib/format';
import { useDados } from '../../lib/store';
import { colors } from '../../theme';

export default function DetalheCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cliente, ordens, removerCliente } = useDados();
  const c = cliente(id);
  if (!c) return <Vazio icon="help-circle-outline" texto="Cliente não encontrado." />;

  const os = ordens.filter((o) => o.clienteId === c.id).sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada));
  const total = os.filter((o) => o.status === 'entregue').reduce((t, o) => t + (o.valorFinal || o.valorOrcamento), 0);

  const excluir = () => {
    if (os.length) {
      const msg = 'Este cliente possui ordens de serviço vinculadas. Exclua as OS antes.';
      return Platform.OS === 'web' ? globalThis.alert?.(msg) : Alert.alert('Não é possível excluir', msg);
    }
    const fazer = async () => {
      await removerCliente(c.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Excluir este cliente?')) fazer();
    } else {
      Alert.alert('Excluir cliente', 'Deseja excluir este cliente?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: fazer },
      ]);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: c.nome,
          headerRight: () => (
            <Pressable onPress={() => router.push({ pathname: '/cliente/novo', params: { id: c.id } })} hitSlop={10}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Card>
          <Linha icon="call-outline" label="Telefone" valor={c.telefone} />
          <Linha icon="mail-outline" label="E-mail" valor={c.email} />
          <Linha icon="location-outline" label="Endereço" valor={c.endereco} />
          <Linha icon="document-text-outline" label="Observações" valor={c.notas} />
          <Linha icon="calendar-outline" label="Cliente desde" valor={fmtData(c.criadoEm)} />
          {!!c.telefone && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Botao label="Ligar" variante="secundario" icon="call" onPress={() => Linking.openURL(`tel:${c.telefone.replace(/\D/g, '')}`)} style={{ flex: 1 }} />
              <Botao
                label="WhatsApp"
                variante="secundario"
                icon="logo-whatsapp"
                onPress={() => {
                  const n = c.telefone.replace(/\D/g, '');
                  Linking.openURL(`https://wa.me/${n.length <= 11 ? '55' + n : n}`);
                }}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </Card>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '800' }}>{os.length}</Text>
            <Text style={{ color: colors.textSec, fontSize: 12 }}>Atendimentos</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '800' }}>{fmtMoeda(total)}</Text>
            <Text style={{ color: colors.textSec, fontSize: 12 }}>Total gasto</Text>
          </Card>
        </View>

        <Titulo acao={{ label: '+ Nova OS', onPress: () => router.push({ pathname: '/ordem/nova', params: { clienteId: c.id } }) }}>
          Ordens de serviço
        </Titulo>
        {os.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSec }}>Nenhuma OS para este cliente.</Text>
          </Card>
        ) : (
          os.map((o) => <OrdemItem key={o.id} o={o} cliente={c} />)
        )}

        <Botao label="Excluir cliente" variante="perigo" icon="trash-outline" onPress={excluir} style={{ marginTop: 28 }} />
      </ScrollView>
    </>
  );
}
