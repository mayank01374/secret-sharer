import { Router, Request, Response } from 'express';
import db from '../db';
import redis from '../cache';
import bcrypt from 'bcrypt';

const router = Router();

router.get('/secret/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const redisKey = `secret:${id}`;
    const cached = await redis.get(redisKey);
    let ciphertext: string | null = null;
    let iv: string | null = null;
    let secret: any = null;

    if (!cached) {
      const result = await db.query('SELECT * FROM secrets WHERE secret_id = $1', [id]);
      console.log('DB result for secret:', result.rows);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      secret = result.rows[0];
      if (!secret) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      if (secret.accessed_at || new Date(secret.expires_at) < new Date()) {
        return res.status(410).json({ error: 'Secret has expired or was already viewed' });
      }
      ciphertext = secret.encrypted_content;
      iv = secret.iv;
    } else {
      let cacheData;
      try {
        cacheData = JSON.parse(cached);
      } catch (e) {
        console.error('Corrupted cache data:', cached);
        return res.status(500).json({ error: 'Corrupted cache data' });
      }
      console.log('Cache data:', cacheData);
      ciphertext = cacheData.ciphertext;
      iv = cacheData.iv;
      const result = await db.query('SELECT accessed_at, expires_at FROM secrets WHERE secret_id = $1', [id]);
      console.log('DB result for cache check:', result.rows);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      secret = result.rows[0];
      if (!secret) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      if (secret.accessed_at || new Date(secret.expires_at) < new Date()) {
        return res.status(410).json({ error: 'Secret has expired or was already viewed' });
      }
    }

    if (!ciphertext || !iv) {
      return res.status(404).json({ error: 'Secret not found' });
    }

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
    return res.json({ ciphertext, iv });
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
    console.log('DB result for password verify:', result.rows);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }
    const secret = result.rows[0];
    if (!secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }
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