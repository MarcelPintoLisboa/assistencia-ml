import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { EtiquetaPreview } from '../../components/EtiquetaPreview';
import { Botao, Campo, Card, Chips, Rotulo, Titulo } from '../../components/ui';
import { comLoja, modeloPadrao, novoModelo, TAMANHOS } from '../../lib/etiqueta';
import { escolherImagem } from '../../lib/imagens';
import { useDados } from '../../lib/store';
import type { ModeloEtiqueta, OrdemServico, TamanhoEtiqueta } from '../../lib/types';
import { colors, radius } from '../../theme';

const CORES_DESTAQUE = ['#0891B2', '#2563EB', '#7C3AED', '#DC2626', '#EA580C', '#16A34A', '#111827', '#DB2777'];
const CORES_FUNDO = ['#FFFFFF', '#F8FAFC', '#FEF9C3', '#ECFEFF', '#0B1220', '#111827'];
const CORES_TEXTO = ['#0B1220', '#111827', '#374151', '#FFFFFF'];

const EXEMPLO: OrdemServico = {
  id: 'ex', numero: 128, clienteId: '', tipoEquipamento: 'Drone', marca: 'DJI', modelo: 'Mini 4 Pro',
  numeroSerie: '1581F6Z9C23', acessorios: '2 baterias, controle', defeito: 'Caiu na água durante o voo',
  defeitos: ['Contato com água', 'Não liga'], diagnostico: '', status: 'recebido', prioridade: 'alta',
  valorOrcamento: 0, valorFinal: 0, dataEntrada: new Date().toISOString(),
  previsaoEntrega: new Date(Date.now() + 4 * 86400000).toISOString(), dataSaida: null, garantiaDias: 90,
  procedimentos: [], historico: [],
};

export default function EditarModelo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { modelos, salvarModelo, removerModelo, loja } = useDados();
  const { width } = useWindowDimensions();
  const original = modelos.find((m) => m.id === id) ?? modeloPadrao();
  const [m, setM] = useState<ModeloEtiqueta>(original);
  const set = <K extends keyof ModeloEtiqueta>(k: K, v: ModeloEtiqueta[K]) => setM((x) => ({ ...x, [k]: v }));
  const setMostrar = (k: keyof ModeloEtiqueta['mostrar'], v: boolean) => setM((x) => ({ ...x, mostrar: { ...x.mostrar, [k]: v } }));

  const pegar = async (campo: 'logo' | 'fundo') => {
    try {
      const img = await escolherImagem(campo === 'logo' ? 400 : 900, campo === 'logo');
      if (img) set(campo, img);
    } catch {
      Alert.alert('Ops', 'Não foi possível abrir a galeria.');
    }
  };

  const salvar = async () => {
    await salvarModelo(m);
    router.back();
  };

  const excluir = () => {
    const fazer = async () => {
      await removerModelo(m.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Excluir este modelo?')) fazer();
    } else {
      Alert.alert('Excluir modelo', `Excluir "${m.nome}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: fazer },
      ]);
    }
  };

  const contato = `${loja.instagram} · ${loja.telefone}`;

  return (
    <>
      <Stack.Screen options={{ title: 'Personalizar etiqueta' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={st.palco}>
          <EtiquetaPreview
            o={EXEMPLO}
            c={{ id: '', nome: 'Carla Mendes', telefone: '(81) 99999-0000', email: '', endereco: '', notas: '', criadoEm: '' }}
            m={comLoja(m, loja)}
            contato={contato}
            largura={Math.min(width - 64, 420)}
          />
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12 }}>Prévia com dados de exemplo</Text>
        </View>

        <Titulo>Imagens</Titulo>
        <Card style={{ gap: 14 }}>
          <SeletorImagem titulo="Logo próprio (opcional)" desc={loja.logo ? 'Sem logo próprio, usa o logo da empresa' : 'PNG com fundo transparente fica melhor'} valor={m.logo} onEscolher={() => pegar('logo')} onRemover={() => set('logo', null)} />
          <SeletorImagem titulo="Imagem de fundo" desc="Foto ou arte que fica atrás do texto" valor={m.fundo} onEscolher={() => pegar('fundo')} onRemover={() => set('fundo', null)} />
          {m.fundo && (
            <>
              <Rotulo>Transparência do fundo</Rotulo>
              <Chips
                opcoes={[0.08, 0.15, 0.3, 0.5, 0.8, 1].map((v) => ({ value: v, label: `${Math.round(v * 100)}%` }))}
                valor={m.opacidadeFundo}
                onChange={(v) => set('opacidadeFundo', v)}
              />
            </>
          )}
        </Card>

        <Titulo>Aparência</Titulo>
        <Card>
          <Campo label="Nome do modelo" value={m.nome} onChangeText={(t) => set('nome', t)} />
          <Rotulo>Tamanho do papel</Rotulo>
          <Chips
            opcoes={(Object.keys(TAMANHOS) as TamanhoEtiqueta[]).map((t) => ({ value: t, label: TAMANHOS[t].label }))}
            valor={m.tamanho}
            onChange={(v) => set('tamanho', v)}
          />
          <Rotulo>Cor de destaque</Rotulo>
          <Paleta cores={CORES_DESTAQUE} valor={m.corDestaque} onChange={(v) => set('corDestaque', v)} />
          <Rotulo>Cor do fundo</Rotulo>
          <Paleta cores={CORES_FUNDO} valor={m.corFundo} onChange={(v) => set('corFundo', v)} />
          <Rotulo>Cor do texto</Rotulo>
          <Paleta cores={CORES_TEXTO} valor={m.corTexto} onChange={(v) => set('corTexto', v)} />
          <Campo label="Título" value={m.titulo} onChangeText={(t) => set('titulo', t)} />
          <Campo label="Rodapé" value={m.rodape} onChangeText={(t) => set('rodape', t)} placeholder="Ex.: Garantia de 90 dias" />
        </Card>

        <Titulo>O que mostrar</Titulo>
        <Card style={{ paddingVertical: 4 }}>
          {(
            [
              ['descricao', 'Relato do defeito'],
              ['cliente', 'Nome do cliente'],
              ['telefone', 'Telefone do cliente'],
              ['datas', 'Entrada e previsão'],
              ['serie', 'Nº de série'],
              ['acessorios', 'Acessórios'],
              ['contato', 'Contato da loja'],
            ] as [keyof ModeloEtiqueta['mostrar'], string][]
          ).map(([k, rot], i) => (
            <View key={k} style={[st.toggle, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={{ color: colors.text, flex: 1 }}>{rot}</Text>
              <Switch
                value={m.mostrar[k]}
                onValueChange={(v) => setMostrar(k, v)}
                trackColor={{ true: colors.primaryDim, false: colors.border }}
                thumbColor={m.mostrar[k] ? colors.primary : colors.textMuted}
              />
            </View>
          ))}
        </Card>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>Os defeitos marcados na OS sempre aparecem.</Text>

        <Botao label="Salvar modelo" icon="checkmark" onPress={salvar} style={{ marginTop: 24 }} />
        <Botao
          label="Duplicar modelo"
          variante="secundario"
          icon="copy-outline"
          onPress={async () => {
            const copia = novoModelo(m);
            await salvarModelo(copia);
            router.replace({ pathname: '/etiquetas/editar', params: { id: copia.id } });
          }}
          style={{ marginTop: 10 }}
        />
        {modelos.length > 1 && <Botao label="Excluir modelo" variante="perigo" icon="trash-outline" onPress={excluir} style={{ marginTop: 10 }} />}
      </ScrollView>
    </>
  );
}

function SeletorImagem({ titulo, desc, valor, onEscolher, onRemover }: { titulo: string; desc: string; valor: string | null; onEscolher: () => void; onRemover: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable onPress={onEscolher} style={st.img}>
        {valor ? <Image source={{ uri: valor }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="image-outline" size={26} color={colors.primary} />}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{titulo}</Text>
        <Text style={{ color: colors.textSec, fontSize: 12 }}>{desc}</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
          <Pressable onPress={onEscolher} hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{valor ? 'Trocar' : 'Escolher da galeria'}</Text>
          </Pressable>
          {valor && (
            <Pressable onPress={onRemover} hitSlop={8}>
              <Text style={{ color: colors.critical, fontWeight: '700' }}>Remover</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function Paleta({ cores, valor, onChange }: { cores: string[]; valor: string; onChange: (c: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
      {cores.map((c) => (
        <Pressable
          key={c}
          onPress={() => onChange(c)}
          accessibilityLabel={`Cor ${c}`}
          style={[st.cor, { backgroundColor: c }, valor.toLowerCase() === c.toLowerCase() && st.corAtiva]}
        >
          {valor.toLowerCase() === c.toLowerCase() && <Ionicons name="checkmark" size={16} color={c === '#FFFFFF' || c.startsWith('#F') || c.startsWith('#E') ? '#000' : '#fff'} />}
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  palco: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  img: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgAlt,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  cor: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  corAtiva: { borderWidth: 3, borderColor: colors.primary },
});
