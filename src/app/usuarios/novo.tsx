import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Botao, Campo, Card, Chips, Rotulo } from '../../components/ui';
import { cadastrarUsuario, gerarSenhaProvisoria, listarEmpresas, useConta } from '../../lib/conta';
import { mensagemErro } from '../../lib/supabase';
import type { Empresa } from '../../lib/types';
import { colors } from '../../theme';

const NOVA = '__nova__';

// Libera um acesso: e-mail + senha provisória. O admin geral escolhe a empresa (ou cria uma);
// o admin de uma empresa cadastra só na própria.
export default function NovoAcesso() {
  const { ehAdmin, ehAdminGeral, dono, empresa: minhaEmpresa } = useConta();
  const params = useLocalSearchParams<{ empresa?: string; nome?: string }>();
  const fixa = ehAdminGeral ? params.empresa || null : dono;
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [escolha, setEscolha] = useState<string>(NOVA);
  const [novaEmpresa, setNovaEmpresa] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState(gerarSenhaProvisoria);
  const [admin, setAdmin] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const escolhendo = ehAdminGeral && !fixa;
  useEffect(() => {
    if (escolhendo) listarEmpresas().then(setEmpresas).catch((e) => setErro(mensagemErro(e)));
  }, [escolhendo]);

  if (!ehAdmin || (!ehAdminGeral && !dono)) {
    return <Text style={{ color: colors.textSec, padding: 24, textAlign: 'center' }}>Somente administradores podem cadastrar usuários.</Text>;
  }

  const empresaDestino = escolhendo ? (escolha === NOVA ? null : escolha) : fixa;
  const criandoEmpresa = escolhendo && escolha === NOVA;
  const nomeDestino = criandoEmpresa
    ? novaEmpresa.trim()
    : escolhendo
      ? empresas?.find((e) => e.id === escolha)?.nome ?? ''
      : fixa === dono ? minhaEmpresa : params.nome ?? '';

  const salvar = async () => {
    setErro('');
    if (criandoEmpresa && !novaEmpresa.trim()) return setErro('Informe o nome da nova empresa.');
    if (!nome.trim()) return setErro('Informe o nome da pessoa.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Informe um e-mail válido.');
    if (senha.length < 6) return setErro('A senha provisória precisa ter pelo menos 6 caracteres.');
    setEnviando(true);
    try {
      const r = await cadastrarUsuario({ nome, email, senha, admin, empresa: empresaDestino, novaEmpresa });
      const quem = email.trim().toLowerCase();
      const msg = r.jaTinhaConta
        ? `${quem} já tinha login em outro app da ML Softwares. O acesso foi liberado e a pessoa entra com a senha que já usa.`
        : `Passe para a pessoa:\n\nE-mail: ${quem}\nSenha provisória: ${senha}\n\nNo primeiro acesso ela cria a própria senha.`;
      Alert.alert('Acesso liberado', msg);
      router.back();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: escolhendo ? 'Liberar acesso' : 'Adicionar usuário' }} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Rotulo>Empresa</Rotulo>
          {escolhendo ? (
            empresas === null ? (
              <ActivityIndicator color={colors.primary} style={{ alignSelf: 'flex-start', marginBottom: 12 }} />
            ) : (
              <Chips
                opcoes={[{ value: NOVA, label: '+ Nova empresa' }, ...empresas.map((e) => ({ value: e.id, label: e.nome || e.donoEmail }))]}
                valor={escolha}
                onChange={setEscolha}
              />
            )
          ) : (
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 14 }}>{nomeDestino || 'Sua empresa'}</Text>
          )}
          {criandoEmpresa && (
            <Campo label="Nome da nova empresa *" value={novaEmpresa} onChangeText={setNovaEmpresa} placeholder="Ex.: Assistência Silva" />
          )}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Campo label="Nome da pessoa *" value={nome} onChangeText={setNome} placeholder="Nome do usuário" />
          <Campo label="E-mail (login) *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Campo label="Senha provisória *" value={senha} onChangeText={setSenha} autoCapitalize="none" autoCorrect={false} placeholder="Mínimo de 6 caracteres" />
          <Botao label="Gerar outra senha" variante="secundario" icon="refresh" onPress={() => setSenha(gerarSenhaProvisoria())} style={{ marginBottom: 14 }} />
          {criandoEmpresa ? (
            <Text style={{ color: colors.textSec, fontSize: 12, lineHeight: 18 }}>
              Quem cria a empresa vira dono e administrador dela e poderá adicionar e remover os usuários da empresa.
            </Text>
          ) : (
            <>
              <Rotulo>Permissão</Rotulo>
              <Chips
                opcoes={[
                  { value: 'usuario', label: 'Usuário' },
                  { value: 'admin', label: 'Administrador' },
                ]}
                valor={admin ? 'admin' : 'usuario'}
                onChange={(v) => setAdmin(v === 'admin')}
              />
              <Text style={{ color: colors.textSec, fontSize: 12, lineHeight: 18 }}>
                {admin
                  ? 'Administrador: faz tudo no app da empresa, inclusive indicadores, custos, alterar a empresa e adicionar ou remover usuários.'
                  : 'Usuário: abre OS, faz vendas, agenda e imprime documentos. Não vê custos e indicadores, não exclui produtos, não cancela vendas.'}
              </Text>
            </>
          )}
        </Card>
        {!!erro && <Text style={{ color: colors.critical, fontWeight: '600', marginTop: 14 }}>{erro}</Text>}
        {enviando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <Botao label="Liberar acesso" icon="person-add" onPress={salvar} style={{ marginTop: 20 }} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
