import { Text } from 'react-native';
import {
  CORES_CONSOLE, MODELOS_CONSOLE, ORIGEM_ENVIO, PROBLEMAS_CONTROLE, SERVICOS_CONSOLE, SITUACAO, TIPO_ENVIO, VERSOES_CONSOLE,
} from '../lib/fichas';
import type { FichaEnvio } from '../lib/types';
import { colors } from '../theme';
import { deSimNao, SIM_NAO, simNao } from './FichaEntradaForm';
import { Campo, Card, ChipsMulti, Escolha, Rotulo } from './ui';

const opcoes = <K extends string>(r: Record<K, string>) => (Object.keys(r) as K[]).map((k) => ({ value: k, label: r[k] }));

/**
 * Campos da "Ficha envio assistência" que não têm campo próprio na OS.
 * Nome, endereço, RG/CPF, tel. vêm do cliente; nº de série, marca, modelo, garantia e
 * descritivo do defeito ficam nos campos normais da OS. A cor escolhida aqui vai para o campo "Cor".
 */
export function FichaEnvioForm({
  ficha,
  onChange,
  drone,
  cor,
  onCor,
}: {
  ficha: FichaEnvio;
  onChange: (f: FichaEnvio) => void;
  drone: boolean;
  cor: string;
  onCor: (c: string) => void;
}) {
  const set = <K extends keyof FichaEnvio>(k: K, v: FichaEnvio[K]) => onChange({ ...ficha, [k]: v });
  const aparelho = drone ? 'Drone' : 'Console';

  return (
    <Card>
      <Text style={{ color: colors.textSec, fontSize: 12, marginBottom: 12 }}>
        Campos com * são obrigatórios ao abrir a OS. O que for marcado sai na etiqueta e na ficha impressa.
      </Text>
      <Escolha rotulo="Tipo *" opcoes={opcoes(TIPO_ENVIO)} valor={ficha.tipo} onChange={(v) => set('tipo', v)} />
      <Escolha rotulo="De quem é o aparelho *" opcoes={opcoes(ORIGEM_ENVIO)} valor={ficha.origem} onChange={(v) => set('origem', v)} />
      <Escolha
        rotulo={`${aparelho} chegou *`}
        opcoes={(Object.keys(SITUACAO) as (keyof typeof SITUACAO)[])
          .filter((k) => !drone || k === 'liga' || k === 'nao_liga')
          .map((k) => ({ value: k, label: SITUACAO[k], color: k === 'liga' ? colors.good : colors.critical }))}
        valor={ficha.situacao}
        onChange={(v) => set('situacao', v)}
      />
      <Escolha rotulo={`${aparelho} com defeito?`} opcoes={SIM_NAO} valor={simNao(ficha.defeito)} onChange={(v) => set('defeito', deSimNao(v))} />

      <Rotulo>Acompanha</Rotulo>
      <ChipsMulti
        opcoes={[
          { value: 'c1', label: '1 controle' },
          { value: 'c2', label: '2 controles' },
          { value: 'cabos', label: 'Cabos' },
          { value: 'jogos', label: 'Jogos' },
          { value: 'ap', label: 'AP' },
        ]}
        valores={[
          ...(ficha.controles === 1 ? ['c1' as const] : ficha.controles === 2 ? ['c2' as const] : []),
          ...(ficha.cabos ? ['cabos' as const] : []),
          ...(ficha.jogos ? ['jogos' as const] : []),
          ...(ficha.ap ? ['ap' as const] : []),
        ]}
        onChange={(v) => {
          // 1 e 2 controles são exclusivos: vale o último marcado
          const c1 = v.includes('c1') && !(ficha.controles === 1 && v.includes('c2'));
          const c2 = v.includes('c2') && !(ficha.controles === 2 && v.includes('c1'));
          onChange({
            ...ficha,
            controles: c2 ? 2 : c1 ? 1 : undefined,
            cabos: v.includes('cabos') || undefined,
            jogos: v.includes('jogos') || undefined,
            ap: v.includes('ap') || undefined,
          });
        }}
      />

      {!drone && (
        <>
          <Escolha rotulo="Modelo do console" opcoes={MODELOS_CONSOLE} valor={ficha.modelo} onChange={(v) => set('modelo', v)} />
          <Escolha rotulo="Versão" opcoes={VERSOES_CONSOLE} valor={ficha.versao} onChange={(v) => set('versao', v)} />
          <Escolha rotulo="Cor" opcoes={CORES_CONSOLE.map((c) => ({ value: c, label: c }))} valor={CORES_CONSOLE.includes(cor) ? cor : undefined} onChange={(v) => onCor(v ?? '')} />
          <Rotulo>Controle com problema</Rotulo>
          <ChipsMulti opcoes={opcoes(PROBLEMAS_CONTROLE)} valores={ficha.controle ?? []} onChange={(v) => set('controle', v)} />
          <Rotulo>Serviço a fazer</Rotulo>
          <ChipsMulti opcoes={SERVICOS_CONSOLE.map((s) => ({ value: s, label: s }))} valores={ficha.servicos ?? []} onChange={(v) => set('servicos', v)} />
        </>
      )}
      <Campo label="Serviço (detalhes)" value={ficha.servico ?? ''} onChangeText={(t) => set('servico', t)} multiline placeholder="O que a assistência deve fazer" />
      <Campo label="Vendedor (VEN)" value={ficha.vendedor ?? ''} onChangeText={(t) => set('vendedor', t)} />
    </Card>
  );
}
