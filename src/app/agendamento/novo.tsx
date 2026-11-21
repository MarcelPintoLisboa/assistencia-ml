import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';
import { CampoData } from '../../components/CampoData';
import { Botao, Campo, Card, Chips, Rotulo, s as ui } from '../../components/ui';
import { LEMBRETES, TIPO_AG } from '../../lib/format';
import { useDados } from '../../lib/store';
import type { TipoAgendamento } from '../../lib/types';
import { colors } from '../../theme';

export default function NovoAgendamento() {
  const params = useLocalSearchParams<{ id?: string; data?: string; ordemId?: string }>();
  const { agendamentos, clientes, ordens, salvarAgendamento, removerAgendamento } = useDados();
  const atual = params.id ? agendamentos.find((a) => a.id === params.id) : undefined;
  const ordemInicial = params.ordemId ? ordens.find((o) => o.id === params.ordemId) : undefined;

  const [titulo, setTitulo] = useState(
    atual?.titulo ?? (ordemInicial ? `Entrega OS #${ordemInicial.numero} — ${ordemInicial.marca} ${ordemInicial.modelo}` : ''),
  );
  const [tipo, setTipo] = useState<TipoAgendamento>(atual?.tipo ?? (ordemInicial ? 'entrega' : 'visita'));
  const [data, setData] = useState<string | null>(
    atual?.data ?? params.data ?? (() => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d.toISOString(); })(),
  );
  const [lembrete, setLembrete] = useState(atual?.lembreteMin ?? 60);
  const [clienteId, setClienteId] = useState<string | null>(atual?.clienteId ?? ordemInicial?.clienteId ?? null);
  const [ordemId] = useState<string | null>(atual?.ordemId ?? ordemInicial?.id ?? null);
  const [notas, setNotas] = useState(atual?.notas ?? '');

  const salvar = async () => {
    if (!titulo.trim() || !data) {
      const msg = 'Informe o título e a data.';
      return Platform.OS === 'web' ? globalThis.alert?.(msg) : Alert.alert('Atenção', msg);
    }
    await salvarAgendamento({
      id: atual?.id,
      titulo: titulo.trim(),
      tipo,
      data,
      lembreteMin: lembrete,
      clienteId,
      ordemId,
      notas: notas.trim(),
      concluido: atual?.concluido ?? false,
    });
    router.back();
  };

  const excluir = async () => {
    if (!atual) return;
    await removerAgendamento(atual.id);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: atual ? 'Editar agendamento' : 'Novo agendamento' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Rotulo>Tipo</Rotulo>
          <Chips
            opcoes={(Object.keys(TIPO_AG) as TipoAgendamento[]).map((t) => ({ value: t, label: TIPO_AG[t].label }))}
            valor={tipo}
            onChange={setTipo}
          />
          <Campo label="Título *" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Visita técnica — troca de fonte" />
          <CampoData label="Data e hora *" valor={data} onChange={setData} />
          <Rotulo>Lembrete</Rotulo>
          <Chips opcoes={LEMBRETES.map((l) => ({ value: l.min, label: l.label }))} valor={lembrete} onChange={setLembrete} />
          {clientes.length > 0 && (
            <>
              <Rotulo>Cliente (opcional)</Rotulo>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
                {clientes.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setClienteId(c.id === clienteId ? null : c.id)}
                    style={[ui.chip, c.id === clienteId && { borderColor: colors.primary, backgroundColor: colors.primary + '26' }]}
                  >
                    <Text style={[ui.chipTxt, c.id === clienteId && { color: colors.text }]}>{c.nome}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
          {ordemId && (
            <Text style={{ color: colors.textSec, marginBottom: 12 }}>
              Vinculado à OS #{ordens.find((o) => o.id === ordemId)?.numero}
            </Text>
          )}
          <Campo label="Procedimentos / observações" value={notas} onChangeText={setNotas} multiline placeholder="O que precisa ser feito, o que levar…" />
        </Card>
        <Botao label="Salvar agendamento" icon="checkmark" onPress={salvar} style={{ marginTop: 20 }} />
        {atual && <Botao label="Excluir agendamento" variante="perigo" icon="trash-outline" onPress={excluir} style={{ marginTop: 12 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
