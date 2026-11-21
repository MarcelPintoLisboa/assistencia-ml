import type { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import type { Prioridade, StatusOS, TipoAgendamento } from './types';

type IconName = keyof typeof Ionicons.glyphMap;

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const pad = (n: number) => String(n).padStart(2, '0');

export const fmtData = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const fmtHora = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fmtDataHora = (iso: string | null | undefined) =>
  iso ? `${fmtData(iso)} às ${fmtHora(iso)}` : '—';

export const fmtMoeda = (v: number) =>
  'R$ ' +
  (v || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const parseMoeda = (s: string) => {
  const n = parseFloat(s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const diasEntre = (a: Date, b: Date) =>
  Math.round((inicioDoDia(b).getTime() - inicioDoDia(a).getTime()) / 86400000);

export const STATUS: Record<StatusOS, { label: string; color: string; icon: IconName }> = {
  recebido: { label: 'Recebido', color: colors.primary, icon: 'download-outline' },
  diagnostico: { label: 'Em diagnóstico', color: '#60A5FA', icon: 'search-outline' },
  aguardando_aprovacao: { label: 'Aguard. aprovação', color: colors.warning, icon: 'hourglass-outline' },
  aguardando_peca: { label: 'Aguard. peça', color: colors.serious, icon: 'cube-outline' },
  em_reparo: { label: 'Em reparo', color: '#A78BFA', icon: 'construct-outline' },
  pronto: { label: 'Pronto', color: colors.good, icon: 'checkmark-circle-outline' },
  entregue: { label: 'Entregue', color: colors.textMuted, icon: 'exit-outline' },
  cancelado: { label: 'Cancelado', color: colors.critical, icon: 'close-circle-outline' },
};

export const STATUS_ORDEM: StatusOS[] = [
  'recebido', 'diagnostico', 'aguardando_aprovacao', 'aguardando_peca',
  'em_reparo', 'pronto', 'entregue', 'cancelado',
];

export const PRIORIDADE: Record<Prioridade, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: colors.textMuted },
  normal: { label: 'Normal', color: colors.primary },
  alta: { label: 'Alta', color: colors.warning },
  urgente: { label: 'Urgente', color: colors.critical },
};

export const TIPO_AG: Record<TipoAgendamento, { label: string; icon: IconName }> = {
  visita: { label: 'Visita técnica', icon: 'car-outline' },
  entrega: { label: 'Entrega', icon: 'exit-outline' },
  retirada: { label: 'Retirada', icon: 'download-outline' },
  manutencao: { label: 'Manutenção preventiva', icon: 'build-outline' },
  retorno: { label: 'Retorno / garantia', icon: 'refresh-outline' },
  outro: { label: 'Outro', icon: 'ellipsis-horizontal-circle-outline' },
};

export const LEMBRETES = [
  { min: 0, label: 'Na hora' },
  { min: 15, label: '15 min antes' },
  { min: 60, label: '1 h antes' },
  { min: 180, label: '3 h antes' },
  { min: 1440, label: '1 dia antes' },
];

export const TIPOS_EQUIPAMENTO = [
  'Celular', 'Notebook', 'Computador', 'Tablet', 'Impressora',
  'TV', 'Videogame', 'Eletrodoméstico', 'Outro',
];
