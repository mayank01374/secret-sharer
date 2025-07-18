import { Router, Request, Response } from 'express';
import db from '../db';
import redis from '../cache';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const router = Router();

// Encryption key (in production, use environment variable)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';

// Simple AES encryption/decryption
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
  const { content, password, expiresIn = 60 } = req.body; // Default 60 minutes

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  if (content.length > 10000) {
    return res.status(400).json({ error: 'Content too long (max 10KB)' });
  }

  const secretId = nanoid(12);
  const encryptedContent = encrypt(content);
  let passwordHash = null;

  try {
    // Hash password if provided
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

    // Store in database
    await db.query(
      'INSERT INTO secrets (secret_id, encrypted_content, password_hash, expires_at, created_at, access_count) VALUES ($1, $2, $3, $4, $5, $6)',
      [secretId, encryptedContent, passwordHash, expiresAt, new Date(), 0]
    );

    // Audit log: secret created
    await db.query(
      `INSERT INTO audit_logs (secret_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [secretId, 'created', req.ip, req.headers['user-agent']]
    );

    // Store in Redis with TTL
    const redisKey = `secret:${secretId}`;
    await redis.set(redisKey, encryptedContent, { EX: expiresIn * 60 });

    const secretUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/secret/${secretId}`;
    res.status(201).json({ 
      secretUrl,
      expiresAt: expiresAt.toISOString(),
      expiresIn: `${expiresIn} minutes`
    });
  } catch (error) {
    console.error('Error creating secret:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 