import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { limparObjeto, MODELOS_CONSOLE, VERSOES_CONSOLE } from '../lib/fichas';
import type { FichaEntrada } from '../lib/types';
import { colors } from '../theme';
import { CampoData } from './CampoData';
import { Campo, Card, ChipsMulti, Escolha, Rotulo } from './ui';

type Opcao<T> = { value: T; label: string };

const TIPOS: Opcao<NonNullable<FichaEntrada['tipo']>>[] = [
  { value: 'compra', label: 'Compra' },
  { value: 'troca', label: 'Troca' },
  { value: 'venda', label: 'Venda' },
  { value: 'manutencao', label: 'Manutenção' },
];
const ORIGENS: Opcao<NonNullable<FichaEntrada['origem']>>[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'olx', label: 'OLX' },
  { value: 'outros', label: 'Outros' },
];
const CORES: Opcao<NonNullable<FichaEntrada['cor']>>[] = [
  { value: 'branco', label: 'Branco' },
  { value: 'preto', label: 'Preto' },
  { value: 'especial', label: 'Série especial' },
];
const ACOMPANHA: Opcao<NonNullable<FichaEntrada['acompanha']>[number]>[] = [
  { value: 'controle', label: 'Controle' },
  { value: 'cabos', label: 'Cabos' },
  { value: 'jogos', label: 'Jogos' },
];
const MODELOS = MODELOS_CONSOLE;
const VERSOES = VERSOES_CONSOLE;
export const SIM_NAO: Opcao<'sim' | 'nao'>[] = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
];

/** Tira campos vazios; devolve null se não sobrou nada preenchido. */
export const limparFicha = (f: FichaEntrada) => limparObjeto(f);

export const simNao = (b: boolean | undefined) => (b === undefined ? undefined : b ? 'sim' : 'nao');
export const deSimNao = (v: 'sim' | 'nao' | undefined) => (v === undefined ? undefined : v === 'sim');

export function FichaEntradaForm({ ficha, onChange, abertaInicial }: { ficha: FichaEntrada; onChange: (f: FichaEntrada) => void; abertaInicial: boolean }) {
  const [aberta, setAberta] = useState(abertaInicial);
  const set = <K extends keyof FichaEntrada>(k: K, v: FichaEntrada[K]) => onChange({ ...ficha, [k]: v });
  const preenchidos = limparFicha(ficha) ? Object.keys(limparFicha(ficha)!).length : 0;

  return (
    <Card style={{ marginTop: 16 }}>
      <Pressable onPress={() => setAberta(!aberta)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="button">
        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Ficha técnica de entrada</Text>
          <Text style={{ color: colors.textSec, fontSize: 12 }}>
            Opcional{preenchidos ? ` · ${preenchidos} campo${preenchidos > 1 ? 's' : ''} preenchido${preenchidos > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
        <Ionicons name={aberta ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSec} />
      </Pressable>

      {aberta && (
        <View style={{ marginTop: 16 }}>
          <Escolha rotulo="Tipo de entrada" opcoes={TIPOS} valor={ficha.tipo} onChange={(v) => set('tipo', v)} />
          <CampoData label="Data de entrada" valor={ficha.data ?? null} onChange={(v) => set('data', v ?? undefined)} comHora={false} opcional />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Campo label="OS" value={ficha.os ?? ''} onChangeText={(t) => set('os', t)} />
            </View>
            <View style={{ flex: 1 }}>
              <Campo label="Técnico" value={ficha.tecnico ?? ''} onChangeText={(t) => set('tecnico', t)} />
            </View>
          </View>

          <Campo label="Nome do ex-proprietário" value={ficha.exProprietario ?? ''} onChangeText={(t) => set('exProprietario', t)} />
          <Campo label="Endereço" value={ficha.endereco ?? ''} onChangeText={(t) => set('endereco', t)} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Campo label="RG ou CPF" value={ficha.documento ?? ''} onChangeText={(t) => set('documento', t)} />
            </View>
            <View style={{ flex: 1 }}>
              <Campo label="Telefone" value={ficha.telefone ?? ''} onChangeText={(t) => set('telefone', t)} keyboardType="phone-pad" />
            </View>
          </View>
          <Campo label="Nº de série (NS)" value={ficha.numeroSerie ?? ''} onChangeText={(t) => set('numeroSerie', t)} autoCapitalize="characters" />

          <Escolha rotulo="Modelo" opcoes={MODELOS} valor={ficha.modelo} onChange={(v) => set('modelo', v)} />
          <Escolha rotulo="Versão" opcoes={VERSOES} valor={ficha.versao} onChange={(v) => set('versao', v)} />
          <Escolha rotulo="Cor" opcoes={CORES} valor={ficha.cor} onChange={(v) => set('cor', v)} />
          <Rotulo>Acompanha</Rotulo>
          <ChipsMulti opcoes={ACOMPANHA} valores={ficha.acompanha ?? []} onChange={(v) => set('acompanha', v)} />
          <Escolha rotulo="Aparelho liga?" opcoes={SIM_NAO} valor={simNao(ficha.liga)} onChange={(v) => set('liga', deSimNao(v))} />
          <Escolha rotulo="Defeito?" opcoes={SIM_NAO} valor={simNao(ficha.defeito)} onChange={(v) => set('defeito', deSimNao(v))} />
          <Escolha rotulo="Onde foi anunciado / encontrado" opcoes={ORIGENS} valor={ficha.origem} onChange={(v) => set('origem', v)} />

          <Campo label="Estado do aparelho" value={ficha.estado ?? ''} onChangeText={(t) => set('estado', t)} multiline />
          <Campo label="Serviço" value={ficha.servico ?? ''} onChangeText={(t) => set('servico', t)} multiline />
          <Campo label="Final" value={ficha.final ?? ''} onChangeText={(t) => set('final', t)} />
          <Campo label="Observações" value={ficha.observacoes ?? ''} onChangeText={(t) => set('observacoes', t)} multiline />
        </View>
      )}
    </Card>
  );
}
