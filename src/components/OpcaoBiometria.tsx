import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { autenticar, biometriaAtiva, biometriaSuportada, definirBiometria, infoBiometria } from '../lib/biometria';
import { colors } from '../theme';
import { Card, Titulo } from './ui';

/** Ajustes > Segurança: liga/desliga a entrada com Face ID / digital neste aparelho. */
export function OpcaoBiometria() {
  const [info, setInfo] = useState<{ disponivel: boolean; nome: string } | null>(null);
  const [ativa, setAtiva] = useState(false);

  useEffect(() => {
    if (!biometriaSuportada) return;
    infoBiometria().then(setInfo);
    biometriaAtiva().then(setAtiva);
  }, []);

  if (!biometriaSuportada || !info) return null;

  const alternar = async (ligar: boolean) => {
    if (ligar) {
      // confirma que a biometria funciona antes de ligar
      if (!(await autenticar(`Ativar entrada com ${info.nome}`))) return;
    }
    await definirBiometria(ligar);
    setAtiva(ligar);
    if (ligar) Alert.alert('Pronto', `Ao abrir o app, ele vai pedir ${info.nome === 'digital' ? 'sua digital' : `o ${info.nome}`}.`);
  };

  return (
    <>
      <Titulo>Segurança</Titulo>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={info.nome === 'Face ID' || info.nome === 'reconhecimento facial' ? 'scan-outline' : 'finger-print'} size={22} color={colors.primary} />
          <Text style={{ color: colors.text, flex: 1, fontWeight: '600' }}>Entrar com {info.nome}</Text>
          <Switch
            value={ativa}
            disabled={!info.disponivel && !ativa}
            onValueChange={alternar}
            trackColor={{ true: colors.primaryDim, false: colors.border }}
            thumbColor={ativa ? colors.primary : colors.textMuted}
          />
        </View>
        <Text style={{ color: colors.textSec, fontSize: 12, lineHeight: 18 }}>
          {info.disponivel
            ? 'Ao abrir o app (ou voltar a ele depois de 1 minuto), pede a biometria antes de mostrar os dados. Vale só para este aparelho; dá para entrar com e-mail e senha a qualquer momento.'
            : 'Cadastre o Face ID ou a digital nas configurações do aparelho para usar esta opção.'}
        </Text>
      </Card>
    </>
  );
}
