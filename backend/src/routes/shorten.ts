import { Router, Request, Response } from 'express';
import db from '../db';
import redis from '../cache';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const router = Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

router.post('/', async (req: Request, res: Response) => {
  const { ciphertext, iv, expiresIn = 60 } = req.body;

  if (!ciphertext || !iv) {
    return res.status(400).json({ error: 'Missing ciphertext or IV' });
  }

  const secretId = nanoid(12);

  try {
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

    await db.query(
      'INSERT INTO secrets (secret_id, encrypted_content, iv, expires_at, created_at, access_count) VALUES ($1, $2, $3, $4, $5, $6)',
      [secretId, ciphertext, iv, expiresAt, new Date(), 0]
    );

    await db.query(
      `INSERT INTO audit_logs (secret_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [secretId, 'created', req.ip, req.headers['user-agent']]
    );

    const redisKey = `secret:${secretId}`;
    await redis.set(redisKey, ciphertext, { EX: expiresIn * 60 });

    const shortUrl = `${process.env.FRONTEND_URL}/secret/${secretId}`;
    res.status(201).json({ shortUrl });
  } catch (error) {
    console.error('Error creating secret:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/shorten', async (req: Request, res: Response) => {
  const { content, expiresIn = 60 } = req.body;

  if (!content) return res.status(400).json({ error: 'Ciphertext required' });

  const secretId = nanoid(8);
  const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

  try {
    await db.query(
      'INSERT INTO secrets (secret_id, encrypted_content, expires_at, created_at, access_count) VALUES ($1, $2, $3, $4, $5)',
      [secretId, content, expiresAt, new Date(), 0]
    );

    const redisKey = `secret:${secretId}`;
    await redis.set(redisKey, content, { EX: expiresIn * 60 });

    const secretUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/secret/${secretId}`;
    res.status(201).json({ secretUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create secret' });
  }
});

export default router; 