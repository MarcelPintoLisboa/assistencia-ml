import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, type ComponentRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MODELOS_CONSOLE } from '../lib/fichas';
import { CATEGORIA, fmtMoeda } from '../lib/format';
import type { DadosLoja, Produto } from '../lib/types';
import { colors } from '../theme';

/** Proporção do story do Instagram (1080 × 1920). O layout é desenhado numa grade de 360 × 640 unidades. */
export const STORY = { w: 360, h: 640 };

/** "Marca · Modelo" — sem modelo próprio, usa o console marcado na ficha de entrada. */
export function marcaModelo(p: Produto) {
  const daFicha = p.ficha?.modelo
    ? [MODELOS_CONSOLE.find((m) => m.value === p.ficha?.modelo)?.label, p.ficha.versao === 'fat' ? 'Fat' : p.ficha.versao === 'slim' ? 'Slim' : '']
        .filter(Boolean)
        .join(' ')
    : '';
  return [p.marca?.trim(), p.modelo?.trim() || daFicha].filter(Boolean).join(' · ');
}

/**
 * Arte do story: foto, nome, marca/modelo, condição e preço, com o logo e o contato da loja.
 * Não mostra estoque nem custo. `u` = pixels por unidade da grade (largura real / 360).
 */
export const StoryProduto = forwardRef<ComponentRef<typeof View>, { p: Produto; loja: DadosLoja; u: number }>(function StoryProduto({ p, loja, u }, ref) {
  const usado = p.usado;
  const cond = usado ? colors.seriesOut : colors.good;
  const sub = marcaModelo(p);
  const insta = loja.instagram?.trim();

  return (
    <View ref={ref} collapsable={false} style={{ width: STORY.w * u, height: STORY.h * u, overflow: 'hidden' }}>
      <LinearGradient colors={['#050B1A', '#0E1A33', '#13234A']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      {/* brilho ciano atrás da foto */}
      <View style={{ position: 'absolute', top: 120 * u, left: 30 * u, width: 300 * u, height: 300 * u, borderRadius: 150 * u, backgroundColor: colors.primary, opacity: 0.12 }} />

      <View style={{ flex: 1, paddingHorizontal: 24 * u, paddingTop: 34 * u, paddingBottom: 28 * u }}>
        {/* topo: logo / nome da loja */}
        <View style={{ alignItems: 'center', height: 64 * u, justifyContent: 'center' }}>
          {loja.logo ? (
            <Image source={{ uri: loja.logo }} style={{ width: 180 * u, height: 56 * u }} resizeMode="contain" />
          ) : (
            <Text style={{ color: colors.text, fontSize: 24 * u, fontWeight: '900', letterSpacing: 1 * u }} numberOfLines={1}>
              {loja.nome?.toUpperCase()}
            </Text>
          )}
          {!!loja.slogan && (
            <Text style={{ color: colors.textSec, fontSize: 9 * u, letterSpacing: 1.5 * u, marginTop: 2 * u }} numberOfLines={1}>
              {loja.slogan.toUpperCase()}
            </Text>
          )}
        </View>

        {/* foto */}
        <View
          style={{
            marginTop: 16 * u,
            height: 280 * u,
            borderRadius: 22 * u,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderWidth: 2 * u,
            borderColor: colors.primary,
          }}
        >
          {p.foto ? (
            <Image source={{ uri: p.foto }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          ) : (
            <Ionicons name={CATEGORIA[p.categoria].icon} size={120 * u} color={colors.primaryDim} />
          )}
          <View style={{ position: 'absolute', top: 12 * u, left: 12 * u, backgroundColor: cond, borderRadius: 99, paddingHorizontal: 14 * u, paddingVertical: 6 * u }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 * u, letterSpacing: 1 * u }}>{usado ? 'USADO' : 'NOVO'}</Text>
          </View>
        </View>

        {/* nome, marca/modelo */}
        <View style={{ marginTop: 22 * u, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 26 * u, fontWeight: '900', textAlign: 'center', lineHeight: 30 * u }} numberOfLines={2}>
            {p.nome}
          </Text>
          {!!sub && (
            <Text style={{ color: colors.textSec, fontSize: 15 * u, fontWeight: '600', marginTop: 6 * u, textAlign: 'center' }} numberOfLines={1}>
              {sub}
            </Text>
          )}
          {/* condição em destaque, também fora da foto */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * u, marginTop: 10 * u, borderWidth: 1.5 * u, borderColor: cond, backgroundColor: cond + '33', borderRadius: 99, paddingHorizontal: 14 * u, paddingVertical: 5 * u }}>
            <Ionicons name={usado ? 'refresh' : 'sparkles'} size={13 * u} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 13 * u, fontWeight: '800' }}>
              {usado ? 'Produto usado · garantia de 90 dias' : 'Produto novo'}
            </Text>
          </View>
        </View>

        {/* preço */}
        <View style={{ marginTop: 'auto', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.primary, borderRadius: 18 * u, paddingHorizontal: 22 * u, paddingVertical: 8 * u }}>
            <Text style={{ color: colors.bg, fontSize: p.preco > 0 ? 34 * u : 24 * u, fontWeight: '900' }}>
              {p.preco > 0 ? fmtMoeda(p.preco) : 'Consulte o valor'}
            </Text>
          </View>
        </View>

        {/* contato */}
        <View style={{ marginTop: 22 * u, alignItems: 'center', gap: 4 * u }}>
          {!!insta && (
            <Text style={{ color: colors.text, fontSize: 14 * u, fontWeight: '800' }} numberOfLines={1}>
              {insta.startsWith('@') ? insta : `@${insta}`}
            </Text>
          )}
          {!!loja.telefone && (
            <Text style={{ color: colors.textSec, fontSize: 12 * u }} numberOfLines={1}>
              WhatsApp {loja.telefone}
            </Text>
          )}
          {!!loja.endereco && (
            <Text style={{ color: colors.textMuted, fontSize: 10 * u, textAlign: 'center' }} numberOfLines={2}>
              {loja.endereco}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});
