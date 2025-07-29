import { Router, Request, Response } from 'express';
import db from '../db';
import redis from '../cache';
import { nanoid } from 'nanoid';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { ciphertext, iv, expiresIn = 60 } = req.body;

  if (!ciphertext || !iv) {
    return res.status(400).json({ error: 'Missing ciphertext or IV' });
  }

  const secretId = nanoid(8);
  const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

  try {
    await db.query(
      'INSERT INTO secrets (secret_id, encrypted_content, iv, expires_at, created_at, access_count) VALUES ($1, $2, $3, $4, $5, $6)',
      [secretId, ciphertext, iv, expiresAt, new Date(), 0]
    );

    const redisKey = `secret:${secretId}`;
    await redis.set(redisKey, JSON.stringify({ ciphertext, iv }), { EX: expiresIn * 60 });

    const secretUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/secret/${secretId}`;
    res.status(201).json({ secretUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create secret' });
  }
});

export default router;