import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CampoData } from '../../components/CampoData';
import { Botao, Campo, Card, Chips, Rotulo, s as ui, Titulo } from '../../components/ui';
import {
  exemplosEquipamento, fmtMoeda, parseMoeda, PRIORIDADE, procedimentosSugeridos, STATUS, STATUS_ORDEM, TIPOS_EQUIPAMENTO, uid,
} from '../../lib/format';
import { useDados } from '../../lib/store';
import type { Prioridade, Procedimento, StatusOS } from '../../lib/types';
import { colors, radius } from '../../theme';

export default function NovaOrdem() {
  const { id, clienteId: clienteParam } = useLocalSearchParams<{ id?: string; clienteId?: string }>();
  const { ordens, clientes, salvarOrdem, salvarCliente } = useDados();
  const atual = id ? ordens.find((o) => o.id === id) : undefined;

  const [clienteId, setClienteId] = useState(atual?.clienteId ?? clienteParam ?? '');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [novoCliente, setNovoCliente] = useState(clientes.length === 0);
  const [nomeNovo, setNomeNovo] = useState('');
  const [telNovo, setTelNovo] = useState('');

  const [tipo, setTipo] = useState(atual?.tipoEquipamento ?? 'Drone');
  const ex = exemplosEquipamento(tipo);
  const [marca, setMarca] = useState(atual?.marca ?? '');
  const [modelo, setModelo] = useState(atual?.modelo ?? '');
  const [serie, setSerie] = useState(atual?.numeroSerie ?? '');
  const [acessorios, setAcessorios] = useState(atual?.acessorios ?? '');
  const [defeito, setDefeito] = useState(atual?.defeito ?? '');
  const [diagnostico, setDiagnostico] = useState(atual?.diagnostico ?? '');
  const [status, setStatus] = useState<StatusOS>(atual?.status ?? 'recebido');
  const [prioridade, setPrioridade] = useState<Prioridade>(atual?.prioridade ?? 'normal');
  const [orcamento, setOrcamento] = useState(atual?.valorOrcamento ? fmtMoeda(atual.valorOrcamento).replace('R$ ', '') : '');
  const [valorFinal, setValorFinal] = useState(atual?.valorFinal ? fmtMoeda(atual.valorFinal).replace('R$ ', '') : '');
  const [entrada, setEntrada] = useState<string | null>(atual?.dataEntrada ?? new Date().toISOString());
  const [previsao, setPrevisao] = useState<string | null>(
    atual ? atual.previsaoEntrega : (() => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(17, 0, 0, 0); return d.toISOString(); })(),
  );
  const [garantia, setGarantia] = useState(atual?.garantiaDias ?? 90);
  const [procs, setProcs] = useState<Procedimento[]>(atual?.procedimentos ?? []);
  const [novoProc, setNovoProc] = useState('');

  const addProc = (txt: string) => {
    const t = txt.trim();
    if (!t) return;
    setProcs((p) => [...p, { id: uid(), descricao: t, feito: false }]);
    setNovoProc('');
  };

  const erro = (msg: string) => (Platform.OS === 'web' ? globalThis.alert?.(msg) : Alert.alert('Atenção', msg));

  const salvar = async () => {
    let cid = clienteId;
    if (novoCliente) {
      if (!nomeNovo.trim()) return erro('Informe o nome do cliente.');
      const c = await salvarCliente({ nome: nomeNovo.trim(), telefone: telNovo.trim(), email: '', endereco: '', notas: '' });
      cid = c.id;
    }
    if (!cid) return erro('Selecione o cliente.');
    if (!marca.trim() && !modelo.trim()) return erro('Informe a marca ou o modelo do equipamento.');
    if (!defeito.trim()) return erro('Descreva o defeito relatado.');
    const o = await salvarOrdem({
      id: atual?.id,
      clienteId: cid,
      tipoEquipamento: tipo,
      marca: marca.trim(),
      modelo: modelo.trim(),
      numeroSerie: serie.trim(),
      acessorios: acessorios.trim(),
      defeito: defeito.trim(),
      diagnostico: diagnostico.trim(),
      status,
      prioridade,
      valorOrcamento: parseMoeda(orcamento),
      valorFinal: parseMoeda(valorFinal),
      dataEntrada: entrada ?? new Date().toISOString(),
      previsaoEntrega: previsao,
      dataSaida: atual?.dataSaida ?? null,
      garantiaDias: garantia,
      procedimentos: procs,
    });
    if (atual) router.back();
    else router.replace({ pathname: '/ordem/[id]', params: { id: o.id } });
  };

  const clientesFiltrados = clientes
    .filter((c) => !buscaCliente || c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) || c.id === clienteId)
    .slice(0, 12);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: atual ? `Editar OS #${atual.numero}` : 'Nova ordem de serviço' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Titulo>Cliente</Titulo>
        <Card>
          {novoCliente ? (
            <>
              <Campo label="Nome *" value={nomeNovo} onChangeText={setNomeNovo} placeholder="Nome do cliente" />
              <Campo label="Telefone / WhatsApp" value={telNovo} onChangeText={setTelNovo} keyboardType="phone-pad" placeholder="(00) 00000-0000" />
              {clientes.length > 0 && (
                <Pressable onPress={() => setNovoCliente(false)}>
                  <Text style={st.link}>Escolher cliente existente</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <TextInput
                value={buscaCliente}
                onChangeText={setBuscaCliente}
                placeholder="Buscar cliente…"
                placeholderTextColor={colors.textMuted}
                style={[ui.input, { marginBottom: 10 }]}
              />
              <View style={ui.chips}>
                {clientesFiltrados.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setClienteId(c.id)}
                    style={[ui.chip, c.id === clienteId && { borderColor: colors.primary, backgroundColor: colors.primary + '26' }]}
                  >
                    <Text style={[ui.chipTxt, c.id === clienteId && { color: colors.text }]}>{c.nome}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setNovoCliente(true)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                <Text style={st.link}>Cadastrar novo cliente</Text>
              </Pressable>
            </>
          )}
        </Card>

        <Titulo>Equipamento</Titulo>
        <Card>
          <Rotulo>Tipo</Rotulo>
          <Chips opcoes={TIPOS_EQUIPAMENTO.map((t) => ({ value: t, label: t }))} valor={tipo} onChange={setTipo} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Campo label="Marca" value={marca} onChangeText={setMarca} placeholder={ex.marca} />
            </View>
            <View style={{ flex: 1 }}>
              <Campo label="Modelo" value={modelo} onChangeText={setModelo} placeholder={ex.modelo} />
            </View>
          </View>
          <Campo label="Nº de série" value={serie} onChangeText={setSerie} autoCapitalize="characters" />
          <Campo label="Acessórios deixados" value={acessorios} onChangeText={setAcessorios} placeholder={ex.acessorios} />
          <Campo label="Defeito relatado *" value={defeito} onChangeText={setDefeito} multiline placeholder="O que o cliente relatou" />
          <Campo label="Diagnóstico técnico" value={diagnostico} onChangeText={setDiagnostico} multiline placeholder="Preenchido após avaliação" />
        </Card>

        <Titulo>Andamento</Titulo>
        <Card>
          <Rotulo>Status</Rotulo>
          <Chips
            opcoes={STATUS_ORDEM.map((s) => ({ value: s, label: STATUS[s].label, color: STATUS[s].color }))}
            valor={status}
            onChange={setStatus}
          />
          <Rotulo>Prioridade</Rotulo>
          <Chips
            opcoes={(Object.keys(PRIORIDADE) as Prioridade[]).map((p) => ({ value: p, label: PRIORIDADE[p].label, color: PRIORIDADE[p].color }))}
            valor={prioridade}
            onChange={setPrioridade}
          />
          <CampoData label="Data de entrada" valor={entrada} onChange={setEntrada} />
          <CampoData label="Previsão de entrega (gera lembrete)" valor={previsao} onChange={setPrevisao} opcional />
          <Rotulo>Garantia</Rotulo>
          <Chips
            opcoes={[0, 30, 90, 180, 365].map((d) => ({ value: d, label: d === 0 ? 'Sem' : `${d} dias` }))}
            valor={garantia}
            onChange={setGarantia}
          />
        </Card>

        <Titulo>Valores</Titulo>
        <Card>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Campo label="Orçamento (R$)" value={orcamento} onChangeText={setOrcamento} keyboardType="decimal-pad" placeholder="0,00" />
            </View>
            <View style={{ flex: 1 }}>
              <Campo label="Valor final (R$)" value={valorFinal} onChangeText={setValorFinal} keyboardType="decimal-pad" placeholder="0,00" />
            </View>
          </View>
        </Card>

        <Titulo>Procedimentos a realizar</Titulo>
        <Card>
          {procs.map((p) => (
            <View key={p.id} style={st.proc}>
              <Ionicons name={p.feito ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={p.feito ? colors.good : colors.textMuted} />
              <Text style={{ color: colors.text, flex: 1 }}>{p.descricao}</Text>
              <Pressable hitSlop={10} onPress={() => setProcs((l) => l.filter((x) => x.id !== p.id))}>
                <Ionicons name="trash-outline" size={18} color={colors.critical} />
              </Pressable>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: procs.length ? 10 : 0 }}>
            <TextInput
              value={novoProc}
              onChangeText={setNovoProc}
              onSubmitEditing={() => addProc(novoProc)}
              placeholder="Adicionar procedimento…"
              placeholderTextColor={colors.textMuted}
              style={[ui.input, { flex: 1 }]}
              returnKeyType="done"
            />
            <Pressable onPress={() => addProc(novoProc)} style={st.addBtn}>
              <Ionicons name="add" size={22} color={colors.bg} />
            </Pressable>
          </View>
          <View style={[ui.chips, { marginTop: 10, marginBottom: 0 }]}>
            {procedimentosSugeridos(tipo).filter((s) => !procs.some((p) => p.descricao === s)).map((s) => (
              <Pressable key={s} onPress={() => addProc(s)} style={ui.chip}>
                <Text style={ui.chipTxt}>+ {s}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Botao label={atual ? 'Salvar alterações' : 'Abrir ordem de serviço'} icon="checkmark" onPress={salvar} style={{ marginTop: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  link: { color: colors.primary, fontWeight: '600' },
  proc: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  addBtn: { width: 46, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
