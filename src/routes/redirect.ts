import { Router, Request, Response } from 'express';
import db from '../db';
import redis from '../cache';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = Router();

// Encryption key (must match the one in shorten.ts)
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

router.get('/secret/:secretId', async (req: Request, res: Response) => {
  const { secretId } = req.params;
  const { password } = req.query;

  try {
    // Check Redis cache first
    const redisKey = `secret:${secretId}`;
    let encryptedContent = await redis.get(redisKey);

    if (!encryptedContent) {
      // If not in Redis, check database
      const result = await db.query(
        'SELECT encrypted_content, password_hash, expires_at, access_count FROM secrets WHERE secret_id = $1',
        [secretId]
      );

      if (result.rowCount === 0) {
        return res.status(404).send('Secret not found or has expired');
      }

      const secret = result.rows[0];
      
      // Check if expired
      if (secret.expires_at && new Date() > new Date(secret.expires_at)) {
        return res.status(410).send('Secret has expired');
      }

      // Check if already accessed (one-shot)
      if (secret.access_count > 0) {
        return res.status(410).send('Secret has already been viewed');
      }

      encryptedContent = secret.encrypted_content;

      // Verify password if required
      if (secret.password_hash) {
        if (!password) {
          return res.status(401).json({ error: 'Password required', requiresPassword: true });
        }
        
        const isValidPassword = await bcrypt.compare(password as string, secret.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }
    }

    // Decrypt and return the secret
    if (!encryptedContent) {
      return res.status(404).send('Secret not found or has expired');
    }
    
    const decryptedContent = decrypt(encryptedContent);

    // Mark as accessed in database
    await db.query(
      'UPDATE secrets SET access_count = access_count + 1, accessed_at = $1 WHERE secret_id = $2',
      [new Date(), secretId]
    );

    // Audit log: secret viewed
    await db.query(
      `INSERT INTO audit_logs (secret_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [secretId, 'viewed', req.ip, req.headers['user-agent']]
    );

    // Remove from Redis (one-shot access)
    await redis.del(redisKey);

    // Return the secret content
    res.json({ 
      content: decryptedContent,
      message: 'Secret retrieved successfully. This secret has been deleted and cannot be accessed again.'
    });

  } catch (error) {
    console.error('Error retrieving secret:', error);
    res.status(500).send('Internal server error');
  }
});

// Password verification endpoint
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