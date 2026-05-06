# Deployment Guide - Aevora Recommendation System

## ✅ Pre-Deployment Checklist

- [ ] All environment variables set (see `.env.example`)
- [ ] GEMINI_API_KEY configured
- [ ] JWT_SECRET generated and set (minimum 32 characters)
- [ ] CORS_ORIGINS configured for your domain
- [ ] NODE_ENV set to "production"
- [ ] Dependencies installed (`npm install`)
- [ ] Server tested locally (`npm start`)

## 🚀 Deployment Platforms

### **Vercel (Recommended)**

```bash
# 1. Push code to GitHub
git push origin main

# 2. Import project in Vercel (vercel.com)
# - Connect your GitHub repository
# - Select the branch
# - Add environment variables (Settings → Environment Variables)

# 3. Deploy
# - Vercel will automatically build and deploy on push
```

**Environment Variables in Vercel Dashboard:**
- Go to Settings → Environment Variables
- Add:
  - `NODE_ENV`: production
  - `GEMINI_API_KEY`: [your key]
  - `JWT_SECRET`: [generated 32+ char string]
  - `CORS_ORIGINS`: https://yourdomain.com,https://www.yourdomain.com

### **Render.com**

```bash
# 1. Create new Web Service
# - Select GitHub repository
# - Runtime: Node
# - Build Command: npm install
# - Start Command: npm start

# 2. Add Environment Variables in Dashboard
# Environment → Add Variable
# - NODE_ENV: production
# - GEMINI_API_KEY: [your key]
# - JWT_SECRET: [generated key]
# - CORS_ORIGINS: [your domain]

# 3. Deploy by pushing to main branch
```

### **Railway.app**

```bash
# 1. Connect GitHub repository
# 2. Railway auto-detects Node.js
# 3. Add variables in Project → Variables:
#    - NODE_ENV=production
#    - GEMINI_API_KEY=[your key]
#    - JWT_SECRET=[generated key]
#    - CORS_ORIGINS=[your domain]
# 4. Push to deploy
```

### **Self-Hosted (AWS EC2, DigitalOcean, etc.)**

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Clone repository
git clone https://github.com/your-repo.git
cd RecommendationSystem-main

# 3. Setup Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Install dependencies
npm install

# 5. Create .env file with production values
nano .env
# Add all production values from .env.example

# 6. Install PM2 for process management
sudo npm install -g pm2

# 7. Start application with PM2
pm2 start server.js --name "aevora-api"
pm2 startup
pm2 save

# 8. Setup reverse proxy (Nginx)
sudo apt-get install -y nginx

# Create /etc/nginx/sites-available/aevora
sudo nano /etc/nginx/sites-available/aevora
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## 🔒 Security Checklist

### Required Changes Before Production

1. **Generate Strong JWT Secret**
   ```bash
   openssl rand -base64 32
   # Store this value in JWT_SECRET environment variable
   ```

2. **Configure CORS Properly**
   - ❌ DON'T use: `CORS_ORIGINS=*`
   - ✅ DO use: `CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`

3. **Set NODE_ENV to production**
   - Disables debug logs
   - Enables security headers
   - Optimizes error messages

4. **Enable HTTPS Only**
   - Use Let's Encrypt (free SSL certificates)
   - Redirect all HTTP to HTTPS
   - Set `Strict-Transport-Security` header

5. **Rotate API Keys**
   - Regenerate GEMINI_API_KEY if exposed
   - Update JWT_SECRET every 6 months
   - Monitor for unauthorized API usage

6. **Implement Monitoring**
   - Setup error tracking (Sentry)
   - Monitor API response times
   - Alert on high error rates

## 📊 Performance Optimization

### Rate Limiting (Built-in)
- General API: 100 requests per 15 minutes per IP
- Auth endpoints: 10 requests per 15 minutes per IP
- Vault/Curator: 30 requests per minute per IP

### Caching Strategy
- Frontend static files: 1 hour cache
- API responses: Short-lived (cache-control headers)
- User profiles: In-memory with file backup

### Database Optimization (if moving to real DB)
- Index user emails and IDs
- Vacuum/analyze regularly
- Monitor slow queries

## 🔧 Monitoring & Logging

### Server Logs
```bash
# Render
View logs in Render dashboard → Logs

# Railway
View logs in Railway dashboard → Deployments → Logs

# Self-hosted (PM2)
pm2 logs aevora-api
pm2 monit
```

### Common Issues

**"Too many requests" errors**
- Check rate limiting settings in server.js
- Verify client-side is batching requests
- Consider implementing request queuing

**"CORS errors"**
- Verify CORS_ORIGINS includes your domain
- Check HTTP vs HTTPS mismatch
- Ensure Authorization header is sent

**"Token validation failed"**
- Verify JWT_SECRET matches across environments
- Check token expiration (7 days)
- Ensure `Authorization: Bearer <token>` format

## 📈 Scaling for Production

### File Storage Limitations
Current implementation uses file-based storage. For production with multiple users:

**Migrate to Real Database:**
```javascript
// Option 1: PostgreSQL (Render, Railway, AWS)
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Option 2: MongoDB (MongoDB Atlas)
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

// Option 3: Supabase (PostgreSQL + Auth)
const { createClient } = require('@supabase/supabase-js');
```

### Load Balancing
- Deploy multiple instances with PM2 cluster mode
- Use Nginx or HAProxy as load balancer
- Enable sticky sessions for user profiles

### CDN for Static Assets
```nginx
# Serve static files through CDN
server {
    location /public {
        add_header Cache-Control "public, max-age=31536000";
        expires 1y;
    }
}
```

## 🚨 Troubleshooting Deployment

### Application won't start
```bash
# Check logs
pm2 logs aevora-api

# Verify environment variables
env | grep -E "NODE_ENV|GEMINI_API_KEY|JWT_SECRET"

# Test locally
npm start
```

### API calls timing out
- Check network connectivity to Gemini API
- Increase timeout in utils/aiClient.js
- Monitor external API status

### High memory usage
- Enable heap snapshots: `node --max-old-space-size=1024 server.js`
- Check for memory leaks in logs
- Consider implementing garbage collection

## ✅ Health Checks

After deployment, verify:

```bash
# 1. Health check endpoint
curl https://yourdomain.com/api/v1/health

# Expected response:
{
  "ok": true,
  "service": "aevora-api",
  "time": "2026-05-06T10:00:00.000Z",
  "port": 3000,
  "env": "production"
}

# 2. CORS is working
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: GET" \
     https://yourdomain.com/api/v1/health

# 3. Rate limiting is working
for i in {1..150}; do curl https://yourdomain.com/api/v1/health; done
# Should get 429 errors after 100 requests

# 4. Auth is working
curl -X POST https://yourdomain.com/api/v1/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@example.com","password":"secure123"}'
```

## 📞 Support

For issues or questions:
- Check application logs
- Review error messages in browser console
- Verify all environment variables are set
- Ensure API keys are valid and have correct permissions
