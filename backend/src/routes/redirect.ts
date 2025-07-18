import { Router, Request, Response } from 'express';
import db from '../db';
import redis from '../cache';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

router.get('/secret/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const password = req.query.password as string | undefined;

  try {
    const redisKey = `secret:${id}`;
    let encryptedContent = await redis.get(redisKey);
    let secret: any = null;

    if (!encryptedContent) {
      const result = await db.query('SELECT * FROM secrets WHERE secret_id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      secret = result.rows[0];
      if (secret.accessed_at || new Date(secret.expires_at) < new Date()) {
        return res.status(410).json({ error: 'Secret has expired or was already viewed' });
      }
      encryptedContent = secret.encrypted_content;
    }

    if (secret?.password_hash) {
      if (!password) {
        return res.status(401).json({ requiresPassword: true });
      }
      const match = await bcrypt.compare(password, secret.password_hash);
      if (!match) {
        return res.status(403).json({ error: 'Incorrect password' });
      }
    }
    //COMMENT ADDED TO REDELPOY

    if (!encryptedContent) {
      return res.status(404).json({ error: 'Secret not found' });
    }
    const content = decrypt(encryptedContent);
    await db.query(
      'UPDATE secrets SET accessed_at = $1, access_count = access_count + 1 WHERE secret_id = $2',
      [new Date(), id]
    );
    await redis.del(redisKey);
    await db.query(
      `INSERT INTO audit_logs (secret_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [id, 'accessed', req.ip, req.headers['user-agent']]
    );
    return res.json({ content });
  } catch (err) {
    console.error('Error retrieving secret:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/secret/:secretId/verify', async (req: Request, res: Response) => {
  const { secretId } = req.params;
  const { password } = req.body;

  try {
    const result = await db.query(
      'SELECT password_hash FROM secrets WHERE secret_id = $1',
      [secretId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    const secret = result.rows[0];
    if (!secret.password_hash) {
      return res.status(400).json({ error: 'This secret does not require a password' });
    }
    const isValidPassword = await bcrypt.compare(password, secret.password_hash);
    if (isValidPassword) {
      res.json({ valid: true });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 