# Deployment Guide

## Option 1: Local Installation (Recommended)

Since MathBot requires Ollama to run locally, most users will install it on their own machines:

1. Clone the repository
2. Run `npm install`
3. Run `bash start.sh`
4. Open http://localhost:3000

## Option 2: Deploy to Vercel (Demo Only)

You can deploy a demo version to Vercel (note: API routes won't work without Ollama):

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy automatically

## Option 3: Self-Hosted Server

For a server deployment:

1. Install Ollama on the server
2. Pull the required models:
   ```bash
   ollama pull qwen2.5:7b
   ollama pull llava
   ```
3. Set environment variables:
   ```env
   OLLAMA_URL=http://localhost:11434
   NODE_ENV=production
   ```
4. Build and run:
   ```bash
   npm run build
   npm start
   ```

## Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install Ollama
RUN apk add --no-cache curl
RUN curl -fsSL https://ollama.ai/install.sh | sh

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start Ollama and the app
CMD ["sh", "-c", "ollama serve & npm start"]
```

Build and run:
```bash
docker build -t mathbot .
docker run -p 3000:3000 mathbot
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API URL |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Main model for text |
| `OLLAMA_VISION_MODEL` | `llava` | Model for images |
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | Port to run on |

## Notes

- MathBot requires local AI models to function properly
- The API routes (`/api/chat`, `/api/practice`) need Ollama running
- Static deployments (GitHub Pages, Vercel) will only show the UI without functionality
- For production, ensure your server has enough RAM (8GB+ recommended for the models)
