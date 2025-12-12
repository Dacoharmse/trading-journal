# Trading Journal - Production Deployment Guide

## Prerequisites

- VPS with Docker and Docker Compose installed
- Domain name pointed to your VPS IP
- SSL certificate (we'll use Caddy for automatic HTTPS)
- Supabase project configured

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url> trading-journal
cd trading-journal
```

### 2. Configure Environment Variables

```bash
cp .env.production.example .env.production.local
nano .env.production.local
```

Fill in your actual values:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `NEXT_PUBLIC_SITE_URL`: Your production domain (e.g., https://journal.yourdomain.com)

### 3. Deploy with Docker

```bash
# Create the external network
docker network create web

# Build and start the container
docker compose up -d --build
```

### 4. Set Up Reverse Proxy (Caddy)

Create a Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

Add:
```
journal.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

## Database Setup

### Run Migrations

Apply all migrations to your Supabase database:

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

Or manually run the SQL files in `supabase/migrations/` via the Supabase SQL Editor.

## Health Monitoring

The application exposes a health endpoint:

```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-24T12:00:00.000Z",
  "version": "0.1.0",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "15ms"
    }
  }
}
```

Use this endpoint for:
- Load balancer health checks
- Uptime monitoring (e.g., UptimeRobot, Pingdom)
- Kubernetes/Docker health checks

## Useful Commands

### View Logs
```bash
docker compose logs -f trading-journal
```

### Restart Application
```bash
docker compose restart trading-journal
```

### Update to Latest Version
```bash
git pull
docker compose up -d --build
```

### Stop Application
```bash
docker compose down
```

## Security Checklist

- [ ] Environment variables are set (not committed to git)
- [ ] Supabase Row Level Security (RLS) is enabled
- [ ] HTTPS is configured via Caddy/Nginx
- [ ] Firewall allows only ports 80, 443, and SSH
- [ ] Regular backups are configured in Supabase

## Supabase Configuration

### Authentication Settings

In Supabase Dashboard > Authentication > URL Configuration:
- Site URL: `https://journal.yourdomain.com`
- Redirect URLs: `https://journal.yourdomain.com/**`

### Email Templates

Customize auth emails in Supabase Dashboard > Authentication > Email Templates

## Troubleshooting

### Container won't start
```bash
docker compose logs trading-journal
```

### Database connection issues
- Verify Supabase credentials in `.env.production.local`
- Check if Supabase project is active
- Test connection at `/api/health`

### CORS errors
- Verify `NEXT_PUBLIC_SITE_URL` matches your actual domain
- Check Supabase CORS settings

## Performance Tips

1. **Enable Supabase connection pooling** for better database performance
2. **Use CDN** for static assets if traffic grows
3. **Monitor memory usage** - Node.js apps may need memory limits adjusted

## Support

For issues, check:
1. Application logs: `docker compose logs -f`
2. Health endpoint: `/api/health`
3. Supabase dashboard for database issues
