# Secure Secret Sharing Platform

A modern, secure, and user-friendly platform for sharing sensitive information with one-time access links. Built with Next.js, Node.js, PostgreSQL, and Redis, featuring client-side encryption and beautiful animations.

## Features

### Security Features

- **Client-side Encryption**: All secrets are encrypted in the browser using AES-256-CBC before being sent to the server
- **One-time Access**: Secrets are automatically deleted after being viewed once
- **Password Protection**: Optional password protection for additional security
- **No Server Access**: The server never sees the plaintext content of your secrets
- **Secure Key Distribution**: Encryption keys are embedded in the URL hash, ensuring only the recipient can decrypt

### User Experience

- **Beautiful UI**: Modern, responsive design with animated backgrounds using VANTA.js
- **QR Code Generation**: Easy sharing via QR codes
- **Copy to Clipboard**: One-click copying of secrets and links
- **Mobile Responsive**: Works perfectly on all devices
- **Real-time Feedback**: Loading states and error handling

### Performance

- **Redis Caching**: Fast secret retrieval with Redis caching
- **PostgreSQL**: Reliable data storage with audit logging
- **Docker Ready**: Containerized deployment with Docker Compose
- **TypeScript**: Type-safe development across the stack

## Architecture

### Frontend (Next.js)

- **Framework**: Next.js 15.4.1 with React 19
- **Styling**: Tailwind CSS with custom animations
- **Encryption**: CryptoJS for AES-256-CBC encryption
- **Animations**: VANTA.js for interactive backgrounds
- **QR Codes**: react-qr-code for link sharing

### Backend (Node.js)

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with CORS support
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for fast secret retrieval
- **Security**: bcrypt for password hashing

### Database Schema

```sql
-- Secrets table
CREATE TABLE secrets (
  id SERIAL PRIMARY KEY,
  secret_id VARCHAR(8) UNIQUE NOT NULL,
  encrypted_content TEXT NOT NULL,
  iv TEXT NOT NULL,
  password_hash TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessed_at TIMESTAMP,
  access_count INTEGER DEFAULT 0
);

-- Audit logs table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  secret_id VARCHAR(8) NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- Docker (optional)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd url
```

### 2. Set Up Environment Variables

#### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/secret_sharing
# or individual variables:
PGHOST=localhost
PGPORT=5432
PGUSER=your_username
PGPASSWORD=your_password
PGDATABASE=secret_sharing

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
FRONTEND_URL=http://localhost:5000
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Set Up Database

```sql
-- Connect to your PostgreSQL database and run:
CREATE TABLE secrets (
  id SERIAL PRIMARY KEY,
  secret_id VARCHAR(8) UNIQUE NOT NULL,
  encrypted_content TEXT NOT NULL,
  iv TEXT NOT NULL,
  password_hash TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessed_at TIMESTAMP,
  access_count INTEGER DEFAULT 0
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  secret_id VARCHAR(8) NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_secrets_secret_id ON secrets(secret_id);
CREATE INDEX idx_secrets_expires_at ON secrets(expires_at);
CREATE INDEX idx_audit_logs_secret_id ON audit_logs(secret_id);
```

### 5. Start the Services

#### Option A: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Option B: Manual Start

```bash
# Start Redis
redis-server

# Start Backend (in backend directory)
cd backend
npm run build
npm start

# Start Frontend (in frontend directory)
cd frontend
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3000

## 📡 API Endpoints

### Create Secret

**POST** `/create`

```bash
curl -X POST http://localhost:3000/create \
  -H "Content-Type: application/json" \
  -d '{
    "ciphertext": "encrypted_content_base64",
    "iv": "initialization_vector_hex",
    "expiresIn": 60
  }'
```

**Response:**

```json
{
  "secretUrl": "http://localhost:5000/secret/abc12345#decryption_key_base64"
}
```

### Retrieve Secret

**GET** `/secret/:secretId`

```bash
curl http://localhost:3000/secret/abc12345
```

**Response:**

```json
{
  "ciphertext": "encrypted_content_base64",
  "iv": "initialization_vector_hex"
}
```

### Verify Password (if password protected)

**POST** `/secret/:secretId/verify`

```bash
curl -X POST http://localhost:3000/secret/abc12345/verify \
  -H "Content-Type: application/json" \
  -d '{"password": "user_password"}'
```

## How It Works

### 1. Secret Creation

1. User enters secret content in the frontend
2. Frontend generates a random AES-256 key and IV
3. Content is encrypted using CryptoJS AES-256-CBC
4. Encrypted content and IV are sent to backend
5. Backend stores encrypted content and generates a unique secret ID
6. Frontend receives the secret URL with the decryption key in the hash

### 2. Secret Retrieval

1. User visits the secret URL
2. Frontend extracts the decryption key from URL hash
3. Frontend requests encrypted content from backend
4. Backend returns encrypted content and IV, then marks secret as accessed
5. Frontend decrypts the content using the key and IV
6. Secret is displayed to user and automatically deleted from server

### 3. Security Features

- **Zero-knowledge**: Server never sees plaintext content
- **One-time access**: Secrets are deleted after viewing
- **Time-based expiration**: Secrets automatically expire
- **Audit logging**: All access attempts are logged
- **Rate limiting**: Built-in protection against abuse

## Docker Deployment

### Production Docker Compose

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: secret_sharing
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://postgres:your_secure_password@postgres:5432/secret_sharing
      - REDIS_URL=redis://redis:6379
      - FRONTEND_URL=https://your-domain.com
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"

  frontend:
    build: ./frontend
    environment:
      - NEXT_PUBLIC_BACKEND_URL=https://your-domain.com/api
    ports:
      - "5000:5000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

## Development

### Backend Development

```bash
cd backend
npm run dev  # Development with hot reload
npm run build  # Build TypeScript
npm start  # Run production build
```

### Frontend Development

```bash
cd frontend
npm run dev  # Development server on port 5000
npm run build  # Build for production
npm start  # Run production build
```

### Database Migrations

For production deployments, consider using a migration tool like:

- **Prisma**: Type-safe database migrations
- **Knex.js**: SQL query builder with migrations
- **Sequelize**: ORM with migration support

## Monitoring and Logging

### Audit Logs

The system automatically logs:

- Secret creation events
- Secret access events
- Failed access attempts
- IP addresses and user agents

### Performance Monitoring

- Redis cache hit/miss rates
- Database query performance
- API response times
- Error rates

## Security Considerations

### Production Checklist

- [ ] Use HTTPS in production
- [ ] Set secure environment variables
- [ ] Configure proper CORS settings
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Database backup strategy
- [ ] SSL/TLS certificates

### Security Features

- **Client-side encryption**: Content never leaves browser unencrypted
- **One-time access**: Prevents replay attacks
- **Time expiration**: Automatic cleanup of old secrets
- **Password protection**: Optional additional security layer
- **Audit logging**: Complete access trail

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Troubleshooting

### Common Issues

#### "column 'iv' does not exist" Error

This error occurs when the database schema is missing the `iv` column. Run this SQL:

```sql
ALTER TABLE secrets ADD COLUMN iv TEXT;
```

#### Redis Connection Issues

Ensure Redis is running and accessible:

```bash
redis-cli ping
# Should return PONG
```

#### Database Connection Issues

Check your PostgreSQL connection:

```bash
psql -h localhost -U your_username -d secret_sharing
```

#### Frontend Can't Connect to Backend

Verify the `NEXT_PUBLIC_BACKEND_URL` environment variable is set correctly in your frontend `.env.local` file.

## Support

For support and questions:

- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the API documentation

---
