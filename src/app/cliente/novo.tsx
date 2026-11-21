import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Botao, Campo, Card } from '../../components/ui';
import { useDados } from '../../lib/store';

export default function NovoCliente() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { clientes, salvarCliente } = useDados();
  const atual = id ? clientes.find((c) => c.id === id) : undefined;
  const [nome, setNome] = useState(atual?.nome ?? '');
  const [telefone, setTelefone] = useState(atual?.telefone ?? '');
  const [email, setEmail] = useState(atual?.email ?? '');
  const [endereco, setEndereco] = useState(atual?.endereco ?? '');
  const [notas, setNotas] = useState(atual?.notas ?? '');

  const salvar = async () => {
    if (!nome.trim()) {
      if (Platform.OS === 'web') globalThis.alert?.('Informe o nome do cliente.');
      else Alert.alert('Atenção', 'Informe o nome do cliente.');
      return;
    }
    await salvarCliente({ id: atual?.id, nome: nome.trim(), telefone: telefone.trim(), email: email.trim(), endereco: endereco.trim(), notas: notas.trim() });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: atual ? 'Editar cliente' : 'Novo cliente' }} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Campo label="Nome *" value={nome} onChangeText={setNome} placeholder="Nome completo" autoFocus={!atual} />
          <Campo label="Telefone / WhatsApp" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholder="(00) 00000-0000" />
          <Campo label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Campo label="Endereço" value={endereco} onChangeText={setEndereco} placeholder="Para visitas técnicas" />
          <Campo label="Observações" value={notas} onChangeText={setNotas} multiline />
        </Card>
        <Botao label="Salvar cliente" icon="checkmark" onPress={salvar} style={{ marginTop: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
