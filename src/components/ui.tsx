import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useDesktop } from '../lib/desktop';
import { colors, radius, space } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

export const toque = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.75 }]}>
      {children}
    </Pressable>
  );
}

/**
 * Título da tela com botão principal. Celular: título e botão largo embaixo.
 * Desktop: título à esquerda e botão compacto à direita, como em sistemas desktop.
 */
export function CabecalhoTela({
  titulo, botao, children,
}: {
  titulo: string;
  botao?: { label: string; icon: IconName; onPress: () => void };
  children?: React.ReactNode;
}) {
  const desktop = useDesktop();
  if (!desktop) {
    return (
      <>
        <Text style={s.h1}>{titulo}</Text>
        {botao && <Botao label={botao.label} icon={botao.icon} onPress={botao.onPress} style={{ marginBottom: 10 }} />}
        {children}
      </>
    );
  }
  return (
    <View style={s.cabecalhoDesktop}>
      <Text style={[s.h1, { marginBottom: 0, flex: 1 }]}>{titulo}</Text>
      {children}
      {botao && <Botao label={botao.label} icon={botao.icon} onPress={botao.onPress} style={{ paddingHorizontal: 22 }} />}
    </View>
  );
}

export function Titulo({ children, acao }: { children: React.ReactNode; acao?: { label: string; onPress: () => void } }) {
  return (
    <View style={s.tituloRow}>
      <Text style={s.titulo}>{children}</Text>
      {acao && (
        <Pressable onPress={acao.onPress} hitSlop={10}>
          <Text style={s.tituloAcao}>{acao.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Botao({
  label,
  onPress,
  icon,
  variante = 'primario',
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variante?: 'primario' | 'secundario' | 'perigo';
  style?: ViewStyle;
}) {
  const cor = variante === 'primario' ? colors.bg : variante === 'perigo' ? colors.critical : colors.primary;
  return (
    <Pressable
      onPress={() => {
        toque();
        onPress();
      }}
      style={(e) => [
        s.botao,
        variante === 'primario' && { backgroundColor: colors.primary },
        variante === 'secundario' && { borderColor: colors.primary, borderWidth: 1 },
        variante === 'perigo' && { borderColor: colors.critical, borderWidth: 1 },
        // hover só existe no desktop/navegador
        (e as typeof e & { hovered?: boolean }).hovered && (variante === 'primario' ? { opacity: 0.88 } : { backgroundColor: cor + '14' }),
        e.pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={cor} />}
      <Text style={[s.botaoTxt, { color: cor }]}>{label}</Text>
    </Pressable>
  );
}

export function Campo({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

export function Rotulo({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Chips<T extends string | number>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { value: T; label: string; color?: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.chips}>
      {opcoes.map((o) => {
        const ativo = o.value === valor;
        const cor = o.color ?? colors.primary;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              toque();
              onChange(o.value);
            }}
            style={[s.chip, ativo && { backgroundColor: cor + '26', borderColor: cor }]}
          >
            <Text style={[s.chipTxt, ativo && { color: colors.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Como Chips, mas permite marcar várias opções (ou nenhuma). */
export function ChipsMulti<T extends string>({
  opcoes,
  valores,
  onChange,
}: {
  opcoes: { value: T; label: string; color?: string }[];
  valores: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <View style={s.chips}>
      {opcoes.map((o) => {
        const ativo = valores.includes(o.value);
        const cor = o.color ?? colors.primary;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              toque();
              onChange(ativo ? valores.filter((v) => v !== o.value) : [...valores, o.value]);
            }}
            style={[s.chip, ativo && { backgroundColor: cor + '26', borderColor: cor }]}
          >
            {ativo && <Ionicons name="checkmark" size={14} color={cor} />}
            <Text style={[s.chipTxt, ativo && { color: colors.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({ label, color, icon }: { label: string; color: string; icon?: IconName }) {
  return (
    <View style={[s.badge, { backgroundColor: color + '22', borderColor: color + '66' }]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={s.badgeTxt}>{label}</Text>
    </View>
  );
}

export function Vazio({ icon, texto, children }: { icon: IconName; texto: string; children?: React.ReactNode }) {
  return (
    <View style={s.vazio}>
      <View style={s.vazioIcone}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={s.vazioTxt}>{texto}</Text>
      {children}
    </View>
  );
}

export function Fab({ onPress, icon = 'add', label = 'Novo' }: { onPress: () => void; icon?: IconName; label?: string }) {
  const desktop = useDesktop();
  if (desktop) {
    // desktop: botão com texto no canto, em vez do círculo flutuante do celular
    return (
      <Pressable
        onPress={onPress}
        style={(e) => [s.fabDesktop, (e as typeof e & { hovered?: boolean }).hovered && { opacity: 0.9 }]}
        accessibilityLabel={label}
      >
        <Ionicons name={icon} size={20} color={colors.bg} />
        <Text style={{ color: colors.bg, fontWeight: '800', fontSize: 15 }}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => {
        toque();
        onPress();
      }}
      style={({ pressed }) => [s.fab, pressed && { transform: [{ scale: 0.94 }] }]}
      accessibilityLabel="Adicionar"
    >
      <Ionicons name={icon} size={28} color={colors.bg} />
    </Pressable>
  );
}

export function Busca({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  return (
    <View style={s.busca}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={s.buscaInput}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

export function Linha({ icon, label, valor }: { icon: IconName; label: string; valor: string }) {
  return (
    <View style={s.linha}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={s.linhaLabel}>{label}</Text>
      <Text style={s.linhaValor} numberOfLines={2}>
        {valor || '—'}
      </Text>
    </View>
  );
}

export const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.md,
  },
  titulo: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  tituloAcao: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.md,
  },
  botaoTxt: { fontSize: 15, fontWeight: '700' },
  label: { color: colors.textSec, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgAlt,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipTxt: { color: colors.textSec, fontSize: 13, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeTxt: { color: colors.text, fontSize: 11, fontWeight: '700' },
  vazio: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 14 },
  vazioIcone: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazioTxt: { color: colors.textSec, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  cabecalhoDesktop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8 },
  fabDesktop: {
    position: 'absolute', right: 28, bottom: 28, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 13, paddingHorizontal: 20, borderRadius: radius.md, backgroundColor: colors.primary,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  buscaInput: { flex: 1, color: colors.text, paddingVertical: 11, fontSize: 15 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  linhaLabel: { color: colors.textSec, fontSize: 14, width: 110 },
  linhaValor: { color: colors.text, fontSize: 14, flex: 1, fontWeight: '500' },
});
