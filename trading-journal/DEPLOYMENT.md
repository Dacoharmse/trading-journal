# Trading Journal - Production Deployment Guide

## Option 1: Automatic Deployment with GitHub Actions (Recommended)

This sets up automatic deployment whenever you push to the master branch.

### Prerequisites
- VPS with SSH access
- Node.js 20+ installed on VPS
- PM2 installed on VPS (`npm install -g pm2`)

---

### Step 1: Generate SSH Key for GitHub Actions

On your **local machine**, generate a dedicated SSH key:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
```

This creates:
- `~/.ssh/github_actions_deploy` (private key - for GitHub)
- `~/.ssh/github_actions_deploy.pub` (public key - for VPS)

---

### Step 2: Add Public Key to VPS

```bash
# Copy public key to VPS
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub your_user@your_vps_ip

# Or manually add to ~/.ssh/authorized_keys on VPS
```

---

### Step 3: Prepare VPS Directory Structure

SSH into your VPS and run:

```bash
# Create deployment directory
sudo mkdir -p /var/www/trading-journal
sudo chown $USER:$USER /var/www/trading-journal

# Create environment variables directory
sudo mkdir -p /var/www/trading-journal-env
sudo chown $USER:$USER /var/www/trading-journal-env

# Create .env.local with your production environment variables
nano /var/www/trading-journal-env/.env.local
```

Add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### Step 4: Install PM2 on VPS

```bash
npm install -g pm2
pm2 startup  # Follow the instructions
```

---

### Step 5: Add GitHub Secrets

Go to: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value |
|-------------|-------|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USERNAME` | SSH username (e.g., `ubuntu`) |
| `VPS_PORT` | SSH port (usually `22`) |
| `VPS_SSH_KEY` | Full contents of `~/.ssh/github_actions_deploy` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

**Get private key:**
```bash
cat ~/.ssh/github_actions_deploy
# Copy ENTIRE content including BEGIN/END lines
```

---

### Step 6: Push and Deploy

```bash
git add .
git commit -m "Add CI/CD deployment"
git push origin master
```

Watch the deployment: **GitHub → Actions tab**

---

### Step 7: Set Up Nginx on VPS

```bash
sudo nano /etc/nginx/sites-available/trading-journal
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

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
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/trading-journal /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

### Step 8: Add SSL (Recommended)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Option 2: Docker Deployment

### Prerequisites
- VPS with Docker and Docker Compose installed
- Domain name pointed to your VPS IP

### Quick Start

```bash
# Clone repository
git clone <your-repo-url> trading-journal
cd trading-journal

# Configure environment
cp .env.production.example .env.production.local
nano .env.production.local

# Deploy with Docker
docker network create web
docker compose up -d --build
```

### Set Up Caddy Reverse Proxy

```bash
sudo nano /etc/caddy/Caddyfile
```

Add:
```
journal.yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

---

## Database Migrations

Apply migrations to Supabase:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Or run SQL files in `supabase/migrations/` via Supabase SQL Editor.

---

## Health Monitoring

Endpoint: `GET /api/health`

```json
{
  "status": "healthy",
  "timestamp": "2024-11-24T12:00:00.000Z",
  "version": "0.1.0"
}
```

---

## Useful PM2 Commands

```bash
pm2 status                    # View status
pm2 logs trading-journal      # View logs
pm2 restart trading-journal   # Restart app
pm2 stop trading-journal      # Stop app
pm2 monit                     # Monitor resources
pm2 save                      # Save process list
```

---

## Troubleshooting

### GitHub Actions failed
- Check: GitHub → Actions → Click workflow → View logs

### Application not starting
```bash
pm2 logs trading-journal
sudo lsof -i :3000
```

### Manual deployment
```bash
# Build locally
npm run build

# Copy to VPS
scp -r .next/standalone user@vps:/var/www/trading-journal/
scp -r .next/static user@vps:/var/www/trading-journal/.next/
scp -r public user@vps:/var/www/trading-journal/

# On VPS
cd /var/www/trading-journal
pm2 restart trading-journal
```

---

## Security Checklist

- [ ] Environment variables not in git
- [ ] Supabase RLS enabled
- [ ] HTTPS configured
- [ ] Firewall: only 80, 443, SSH open
- [ ] Regular Supabase backups
