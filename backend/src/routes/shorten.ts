import { Router, Request, Response } from 'express';
import db from '../db';
import redis from '../cache';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { ciphertext, iv, expiresIn = 60, password } = req.body;

  if (!ciphertext || !iv) {
    return res.status(400).json({ error: 'Missing ciphertext or IV' });
  }

  const secretId = nanoid(8);
  const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

  try {
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    await db.query(
      'INSERT INTO secrets (secret_id, encrypted_content, iv, expires_at, created_at, access_count, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [secretId, ciphertext, iv, expiresAt, new Date(), 0, passwordHash]
    );

    const redisKey = `secret:${secretId}`;
    
    await redis.set(redisKey, JSON.stringify({ ciphertext, iv, hasPassword: !!passwordHash }), { EX: expiresIn * 60 });

    const secretUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/secret/${secretId}`;
    res.status(201).json({ secretUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create secret' });
  }
});

export default router;