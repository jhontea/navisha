# Deployment Guide — navisha.cloud

VPS: `202.155.13.11`  
Domain: `navisha.cloud` (frontend), `api.navisha.cloud` (backend API)  
Database: Supabase (external)

## Architecture

```
Internet
    │
    ▼
Nginx (SSL termination, reverse proxy)
    ├── navisha.cloud  ─────────────► Docker: navisha-frontend (port 3000)
    └── api.navisha.cloud  ─────────► Docker: navisha-backend  (port 8090)
                                              │
                                              ├── Docker: redis-navisha (internal)
                                              └── Supabase PostgreSQL (external)
```

---

## 1. First-Time VPS Setup

SSH into the VPS, then run:

```bash
# System update
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose v2
sudo apt install docker-compose-plugin -y

# Install Nginx + Certbot
sudo apt install nginx certbot python3-certbot-nginx -y
```

---

## 2. DNS Configuration

Arahkan DNS records ke IP VPS (`202.155.13.11`):

| Type | Name              | Value           |
|------|-------------------|-----------------|
| A    | navisha.cloud     | 202.155.13.11   |
| A    | www.navisha.cloud | 202.155.13.11   |
| A    | api.navisha.cloud | 202.155.13.11   |

Tunggu propagasi DNS sebelum lanjut ke langkah SSL.

---

## 3. Setup SSH Key untuk Git (di VPS)

Agar VPS bisa clone/pull via SSH (lebih aman daripada HTTPS + token):

### 3a. Generate SSH Key di VPS

```bash
# Generate key (tekan Enter untuk semua prompt, atau isi passphrase jika mau)
ssh-keygen -t ed25519 -C "navisha-vps-deploy"
```

Ini akan membuat dua file:
- `~/.ssh/id_ed25519` — private key (jangan pernah share)
- `~/.ssh/id_ed25519.pub` — public key (ini yang didaftarkan ke GitHub)

### 3b. Tambahkan Public Key ke GitHub

```bash
# Tampilkan public key
cat ~/.ssh/id_ed25519.pub
```

Copy outputnya, lalu:
1. Buka GitHub → **Settings** → **SSH and GPG keys** → **New SSH key**
2. Paste public key di sana
3. Klik **Add SSH key**

Alternatif: kalau repo ini private dan deploy-only, bisa pakai **Deploy Keys** yang lebih terbatas:
1. Buka repo di GitHub → **Settings** → **Deploy keys** → **Add deploy key**
2. Paste public key, centang **Allow write access** jika perlu
3. Klik **Add key**

### 3c. Test Koneksi SSH ke GitHub

```bash
ssh -T git@github.com
# Output: Hi username! You've successfully authenticated...
```

## 4. Clone Repository

```bash
mkdir -p /opt/navisha
git clone git@github.com:yourusername/navisha.git /opt/navisha
cd /opt/navisha
```

---

## 5. Configure Environment Variables

### Backend

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Isi dengan nilai production:

```env
DATABASE_URL=postgres://user:password@db.supabase.co:5432/postgres?sslmode=require
REDIS_URL=redis://redis:6379
JWT_SECRET=<random string panjang, minimal 32 karakter>
JWT_REFRESH_SECRET=<random string lain, minimal 32 karakter>
GOOGLE_CLIENT_ID=<>
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URL=https://api.navisha.cloud/api/v1/auth/google/callback
FRONTEND_URL=https://navisha.cloud
CURRENCYFREAKS_API_KEY=45205f...
```

> **Penting:** `REDIS_URL` pakai `redis://redis:6379` (service name Docker), bukan `localhost`.

Generate JWT secret yang aman:
```bash
openssl rand -base64 48
```

### Frontend

Buat file `.env.prod` untuk menyimpan build args:

```bash
cat > /opt/navisha/.env.prod << 'EOF'
NEXT_PUBLIC_API_URL=https://api.navisha.cloud/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
EOF
```

---

## 6. Google Cloud Console — Update OAuth

Sebelum deploy, update di [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client:

**Authorized redirect URIs** — tambahkan:
```
https://api.navisha.cloud/api/v1/auth/google/callback
```

**Authorized JavaScript origins** — tambahkan:
```
https://navisha.cloud
https://www.navisha.cloud
```

---

## 7. Google Maps API Key — Restrict di Production

Di Google Cloud Console → APIs & Services → Credentials → klik Maps API key:

1. **Application restrictions** → pilih **HTTP referrers (websites)**
2. Tambahkan allowed referrers:
   - `https://navisha.cloud/*`
   - `https://www.navisha.cloud/*`
3. **API restrictions** → Restrict key → centang:
   - Maps JavaScript API
   - Places API

Key akan ter-embed di JavaScript bundle (karena `NEXT_PUBLIC_`), tapi hanya bisa digunakan dari domain navisha.cloud.

---

## 8. Setup Nginx

```bash
# Copy nginx config
sudo cp /opt/navisha/deploy/nginx/navisha.conf /etc/nginx/sites-available/navisha
sudo ln -s /etc/nginx/sites-available/navisha /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 9. SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d navisha.cloud -d www.navisha.cloud -d api.navisha.cloud
```

Certbot otomatis mengupdate nginx config dengan SSL dan setup auto-renewal.

Verifikasi auto-renewal berjalan:
```bash
sudo certbot renew --dry-run
```

---

## 10. Build & Run

```bash
cd /opt/navisha

# Load env vars untuk build args frontend
export $(cat .env.prod | xargs)

# Build dan jalankan semua service
docker compose -f docker-compose.prod.yml up -d --build
```

Cek status:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
```

---

## 11. Deploy Update (Subsequent Deployments)

```bash
cd /opt/navisha

# Pull latest code
git pull origin main

# Load env vars
export $(cat .env.prod | xargs)

# Rebuild dan restart (zero-downtime tidak otomatis, ada brief downtime)
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Deploy App Lain di VPS yang Sama

Masing-masing app punya direktori dan compose file sendiri:

```
/opt/
├── navisha/
│   └── docker-compose.prod.yml   (ports: 3000, 8090)
└── app-lain/
    └── docker-compose.prod.yml   (ports: 3001, 8091)
```

Tambahkan nginx server block baru di `/etc/nginx/sites-available/app-lain` dengan subdomain/domain berbeda, lalu jalankan certbot untuk SSL-nya.

---

## Troubleshooting

**Backend tidak bisa connect ke Redis:**
```bash
# Cek apakah service redis jalan
docker compose -f docker-compose.prod.yml ps redis
# Pastikan REDIS_URL=redis://redis:6379 (bukan localhost)
```

**Backend tidak bisa connect ke Supabase:**
```bash
# Cek DATABASE_URL format, pastikan ada ?sslmode=require
docker compose -f docker-compose.prod.yml logs backend
```

**Frontend build gagal:**
```bash
# Cek apakah NEXT_PUBLIC_ env vars sudah di-export sebelum docker compose up
echo $NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

**Nginx 502 Bad Gateway:**
```bash
# Pastikan container jalan
docker compose -f docker-compose.prod.yml ps
# Cek port binding
sudo ss -tlnp | grep -E '3000|8090'
```

**View logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
sudo tail -f /var/log/nginx/error.log
```
