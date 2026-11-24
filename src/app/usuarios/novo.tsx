import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Botao, Campo, Card, Chips, Rotulo } from '../../components/ui';
import { cadastrarMembro, useConta } from '../../lib/conta';
import { mensagemErro } from '../../lib/supabase';
import { colors } from '../../theme';

export default function NovoUsuario() {
  const { ehAdmin, dono } = useConta();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [admin, setAdmin] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!ehAdmin || !dono) {
    return <Text style={{ color: colors.textSec, padding: 24, textAlign: 'center' }}>Somente o administrador pode cadastrar usuários.</Text>;
  }

  const salvar = async () => {
    setErro('');
    if (!nome.trim()) return setErro('Informe o nome.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Informe um e-mail válido.');
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    setEnviando(true);
    try {
      const r = await cadastrarMembro(dono, { nome, email, senha, admin });
      const quem = email.trim().toLowerCase();
      const msg = r.jaTinhaConta
        ? `${quem} já tinha conta. Ao entrar no app com a senha dela, aparecerá o convite para a sua loja.`
        : r.precisaConfirmar
          ? `Enviamos um link de confirmação para ${quem}. Depois de confirmar, é só entrar com o e-mail e a senha cadastrados e aceitar o convite.`
          : `${quem} já pode entrar no app com a senha cadastrada. No primeiro acesso, é só aceitar o convite.`;
      Alert.alert('Usuário cadastrado', msg);
      router.back();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Novo usuário' }} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Campo label="Nome *" value={nome} onChangeText={setNome} placeholder="Nome do funcionário" autoFocus />
          <Campo label="E-mail (login) *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Campo label="Senha inicial *" value={senha} onChangeText={setSenha} secureTextEntry placeholder="Mínimo de 6 caracteres" autoCapitalize="none" />
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
              ? 'Administrador: faz tudo no app, inclusive ver indicadores, custos, cadastrar usuários e alterar a empresa.'
              : 'Usuário: abre OS, faz vendas, agenda e imprime documentos. Não vê custos e indicadores, não exclui produtos, não cancela vendas.'}
          </Text>
        </Card>
        {!!erro && <Text style={{ color: colors.critical, fontWeight: '600', marginTop: 14 }}>{erro}</Text>}
        {enviando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <Botao label="Cadastrar usuário" icon="person-add" onPress={salvar} style={{ marginTop: 20 }} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
