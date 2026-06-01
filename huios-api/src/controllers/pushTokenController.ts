import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../services/prisma';

export async function registerToken(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { token, platform } = req.body as { token?: string; platform?: string };
  if (!token || !platform) {
    return res.status(400).json({ message: 'token and platform are required' });
  }

  try {
    const record = await prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
    return res.status(201).json(record);
  } catch (err) {
    console.error('[PushToken] registerToken error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removeToken(req: AuthRequest, res: Response) {
  const { token } = req.params as { token: string };
  if (!token) return res.status(400).json({ message: 'token is required' });

  try {
    await prisma.pushToken.deleteMany({ where: { token } });
    return res.status(204).send();
  } catch (err) {
    console.error('[PushToken] removeToken error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
