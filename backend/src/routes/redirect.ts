import { Router, Request, Response } from 'express';
import db from '../db';
import redis from '../cache';
import bcrypt from 'bcrypt';

const router = Router();


const burnSecret = async (id: string, ip: string | null, userAgent: string | undefined) => {
  await db.query(
    'UPDATE secrets SET accessed_at = $1, access_count = access_count + 1 WHERE secret_id = $2',
    [new Date(), id]
  );
  
  try {
    await redis.del(`secret:${id}`);
  } catch (e) {
    console.warn('Redis unavailable, could not clear cache');
  }

  try {
    await db.query(
      `INSERT INTO audit_logs (secret_id, event_type, ip_address, user_agent) VALUES ($1, $2, $3, $4)`,
      [id, 'accessed', ip, userAgent]
    );
  } catch (logErr) {
    console.error('Failed to write audit log (Non-fatal):', logErr);
  }
};

router.get('/secret/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    
    const result = await db.query('SELECT * FROM secrets WHERE secret_id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }
    const secret = result.rows[0];
    
    if (secret.accessed_at || (secret.expires_at && new Date(secret.expires_at) < new Date())) {
      return res.status(410).json({ error: 'Secret has expired or was already viewed' });
    }

    
    if (secret.password_hash) {
      
      return res.json({ passwordRequired: true }); 
    }

    
    const ip = req.ip || null; 
    const userAgent = req.headers['user-agent'];
    await burnSecret(id, ip, userAgent);

    return res.json({ ciphertext: secret.encrypted_content, iv: secret.iv });

  } catch (err) {
    console.error('Error in /secret/:id:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/secret/:secretId/verify', async (req: Request, res: Response) => {
  const { secretId } = req.params;
  const { password } = req.body;

  try {
    const result = await db.query('SELECT * FROM secrets WHERE secret_id = $1', [secretId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }
    const secret = result.rows[0];

    
    if (secret.accessed_at || (secret.expires_at && new Date(secret.expires_at) < new Date())) {
      return res.status(410).json({ error: 'Secret has expired or was already viewed' });
    }
    
    
    if (secret.password_hash) {
      const isValid = await bcrypt.compare(password, secret.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    
    const ip = req.ip || null; 
    const userAgent = req.headers['user-agent'];
    await burnSecret(secretId, ip, userAgent);

    res.json({ ciphertext: secret.encrypted_content, iv: secret.iv });

  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;