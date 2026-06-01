import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import prisma from './prisma';

const expo = new Expo();

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  const tokens = await prisma.pushToken.findMany({ where: { userId } });
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      sound: 'default' as const,
      title,
      body,
      data: data ?? {},
    }));

  if (messages.length === 0) return;

  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error('[PushService] Failed to send push notifications:', err);
  }
}
