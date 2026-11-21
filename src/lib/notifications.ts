import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const suportado = Platform.OS !== 'web';
const CANAL = 'lembretes';

if (suportado) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function prepararNotificacoes(): Promise<boolean> {
  if (!suportado) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Lembretes e agendamentos',
        // eslint-disable-next-line import/namespace -- exportado via export * (falso positivo)
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22D3EE',
      });
    }
    const atual = await Notifications.getPermissionsAsync();
    if (atual.granted) return true;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.granted;
  } catch {
    return false;
  }
}

/** Agenda um aviso local. Retorna o id, ou null se a data já passou / não suportado. */
export async function agendarAviso(
  titulo: string,
  corpo: string,
  quando: Date,
  dados: Record<string, string> = {},
): Promise<string | null> {
  if (!suportado || quando.getTime() <= Date.now() + 5000) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: corpo, data: dados, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: quando,
        channelId: CANAL,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelarAviso(id: string | null | undefined) {
  if (!suportado || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // já disparada ou inexistente
  }
}
