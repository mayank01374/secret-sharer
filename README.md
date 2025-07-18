# 🚀 Scalable URL Shortener

A high-performance URL shortener built with TypeScript, Node.js, PostgreSQL, and Redis.

## ✨ Features

- **URL Shortening**: Create short URLs from long URLs
- **Redis Caching**: Fast redirects with Redis caching
- **PostgreSQL**: Reliable data storage
- **TypeScript**: Type-safe development
- **Scalable**: Ready for production deployment

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **ID Generation**: nanoid

## 📁 Project Structure

```
url-shortener/
├── src/
│   ├── routes/
│   │   ├── shorten.ts      # URL shortening endpoint
│   │   └── redirect.ts     # URL redirection endpoint
│   ├── db/
│   │   └── index.ts        # PostgreSQL connection
│   ├── cache/
│   │   └── index.ts        # Redis connection
│   ├── types/
│   │   └── url.ts          # TypeScript interfaces
│   ├── app.ts              # Express app setup
│   └── index.ts            # Server entry point
├── .env                    # Environment variables
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

Create a PostgreSQL database and run this SQL:

```sql
CREATE TABLE urls (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Configure Environment

Create a `.env` file:

```env
DATABASE_URL=postgresql://youruser:yourpassword@localhost:5432/url_shortener
REDIS_URL=redis://localhost:6379
BASE_URL=http://localhost:3000
PORT=3000
```

### 4. Start Development Server

```bash
npm run dev
```

## 📡 API Endpoints

### Create Short URL

**POST** `/shorten`

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com/very-long-url"}'
```

**Response:**

```json
{
  "shortUrl": "http://localhost:3000/abc1234"
}
```

### Redirect to Original URL

**GET** `/:code`

```bash
curl -I http://localhost:3000/abc1234
```

Returns a 302 redirect to the original URL.

## 🏗️ Production Build

```bash
npm run build
npm start
```

## 🔧 Development

- **Development**: `npm run dev` - Starts with hot reload
- **Build**: `npm run build` - Compiles TypeScript
- **Start**: `npm start` - Runs compiled JavaScript

## 📊 Performance Features

- **Redis Caching**: 1-hour cache for frequently accessed URLs
- **Database Indexing**: Optimized queries on short_code
- **Connection Pooling**: Efficient PostgreSQL connections
- **Error Handling**: Comprehensive error management

## 🐳 Docker Ready

This project is ready for Docker deployment. Add a `Dockerfile` and `docker-compose.yml` for containerized deployment.

## 📝 License

ISC
