import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: process.env.REDIS_URL?.startsWith('rediss://'),
  },
});

redis.on('error', (err) => console.error('Redis Client Error', err));

redis.connect();

export default redis; 