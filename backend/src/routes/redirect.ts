import { Router, Request, Response } from 'express';
import db from '../db';
import redis from '../cache';
import bcrypt from 'bcrypt';

const router = Router();

router.get('/secret/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const redisKey = `secret:${id}`;
    
    // 1. Try to get from Cache (fail safely if Redis is down)
    let cached = null;
    try {
      cached = await redis.get(redisKey);
    } catch (err) {
      console.warn('Redis unavailable, skipping cache check:', err);
    }

    let ciphertext: string | null = null;
    let iv: string | null = null;
    let secret: any = null;

    if (!cached) {
      const result = await db.query('SELECT * FROM secrets WHERE secret_id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      secret = result.rows[0];
      
      // Check expiration
      if (secret.accessed_at || (secret.expires_at && new Date(secret.expires_at) < new Date())) {
        return res.status(410).json({ error: 'Secret has expired or was already viewed' });
      }
      ciphertext = secret.encrypted_content;
      iv = secret.iv;
    } else {
      // Cache hit
      let cacheData;
      try {
        cacheData = JSON.parse(cached);
        ciphertext = cacheData.ciphertext;
        iv = cacheData.iv;
      } catch (e) {
        console.error('Corrupted cache data');
      }

      // Double check DB to ensure it wasn't burned by someone else just now
      const result = await db.query('SELECT accessed_at, expires_at FROM secrets WHERE secret_id = $1', [id]);
      if (result.rows.length > 0) {
        secret = result.rows[0];
        if (secret.accessed_at || (secret.expires_at && new Date(secret.expires_at) < new Date())) {
          return res.status(410).json({ error: 'Secret has expired or was already viewed' });
        }
      }
    }

    if (!ciphertext || !iv) {
      return res.status(404).json({ error: 'Secret data unavailable' });
    }

    // 2. Mark as accessed (The "Burn")
    await db.query(
      'UPDATE secrets SET accessed_at = $1, access_count = access_count + 1 WHERE secret_id = $2',
      [new Date(), id]
    );

    // 3. Clear cache (fail safely)
    try {
      await redis.del(redisKey);
    } catch (e) {
      console.warn('Redis unavailable, could not clear cache');
    }

    // 4. Log audit (fail safely - DO NOT CRASH REQUEST)
    const ip = req.ip || null; // Ensure null, never undefined
    const userAgent = req.headers['user-agent'] || null;

    try {
      await db.query(
        `INSERT INTO audit_logs (secret_id, event_type, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)`,
        [id, 'accessed', ip, userAgent]
      );
    } catch (logErr) {
      console.error('Failed to write audit log (Non-fatal):', logErr);
    }

    // 5. Return the secret
    return res.json({ ciphertext, iv });

  } catch (err) {
    console.error('CRITICAL ERROR in /secret/:id:', err);
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