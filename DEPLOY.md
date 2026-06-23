# Deployment Guide — navisha.cloud

VPS: `202.155.13.11`  
Domain: `navisha.cloud` (frontend), `api.navisha.cloud` (backend API)  
Database: Neon (external, serverless PostgreSQL)

## Architecture

```
Internet
    │
    ▼
Nginx (SSL termination, reverse proxy)
    ├── navisha.cloud  ─────────────► Docker: navisha-frontend (port 3000)
    ├── api.navisha.cloud  ─────────► Docker: navisha-backend  (port 8090)
    │                                         │
    │                                         ├── Docker: redis-navisha (internal)
    │                                         └── Neon PostgreSQL (external)
    └── dozzle.navisha.cloud  ──────► Docker: navisha-dozzle   (port 8888)
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

> **BuildKit** sudah aktif by default di Docker Engine 23+. Kalau pakai versi lama, enable dengan:
> ```bash
> export DOCKER_BUILDKIT=1
> ```

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
ssh-keygen -t ed25519 -C "navisha-vps-deploy"
```

Ini akan membuat dua file:
- `~/.ssh/id_ed25519` — private key (jangan pernah share)
- `~/.ssh/id_ed25519.pub` — public key (ini yang didaftarkan ke GitHub)

### 3b. Tambahkan Public Key ke GitHub

```bash
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

---

## 4. Clone Repository

```bash
mkdir -p /opt/navisha
git clone git@github.com:jhontea/navisha.git /opt/navisha
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
DATABASE_URL=postgres://user:password@ep-xxx.neon.tech/neondb?sslmode=require
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
> `DATABASE_URL` adalah connection string dari Neon dashboard, pastikan sudah include `?sslmode=require`.

Generate JWT secret yang aman:
```bash
openssl rand -base64 48
```

### Frontend

`NEXT_PUBLIC_*` vars harus di-pass sebagai build args saat `docker compose ... --build` karena Next.js embed nilainya langsung ke dalam JS bundle. Buat file `.env.prod` di root project:

```bash
cat > /opt/navisha/.env.prod << 'EOF'
NEXT_PUBLIC_API_URL=https://api.navisha.cloud/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
EOF

# Tambahkan ke .gitignore jika belum ada
echo ".env.prod" >> /opt/navisha/.gitignore
```

> File ini tidak perlu untuk runtime — hanya dipakai saat build.

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

## 9. Setup Dozzle (Docker Log Viewer)

Dozzle berjalan sebagai container dan diakses via `dozzle.navisha.cloud`. Sudah ditambahkan di `docker-compose.prod.yml` pada port `127.0.0.1:8888`.

> **Catatan:** Dozzle berjalan tanpa autentikasi. Pastikan domain ini tidak dishare ke publik, atau pertimbangkan untuk menambahkan basic auth di masa depan.

### 9a. Tambahkan DNS Record

| Type | Name                  | Value         |
|------|-----------------------|---------------|
| A    | dozzle.navisha.cloud  | 202.155.13.11 |

Tunggu propagasi DNS, lalu jalankan Dozzle bersama service lainnya via `docker compose` (langkah 10).

---

## 10. SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d navisha.cloud -d www.navisha.cloud -d api.navisha.cloud -d dozzle.navisha.cloud
```

Certbot otomatis mengupdate nginx config dengan SSL dan setup auto-renewal.

Verifikasi auto-renewal berjalan:
```bash
sudo certbot renew --dry-run
```

---

## 11. Build & Run (First Deploy)

```bash
cd /opt/navisha

# Load frontend build args
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

> **Catatan BuildKit cache:** Build pertama akan mengunduh semua dependency. Build berikutnya
> jauh lebih cepat karena Go module cache dan npm cache disimpan oleh Docker BuildKit.

---

## 12. Deploy Update (Subsequent Deployments)

```bash
cd /opt/navisha

# Pull latest code
git pull origin main

# Load frontend build args
export $(cat .env.prod | xargs)

# Rebuild dan restart
# --no-deps hanya rebuild service yang berubah (opsional)
docker compose -f docker-compose.prod.yml up -d --build
```

Jika hanya backend yang berubah:
```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

Jika hanya frontend yang berubah:
```bash
export $(cat .env.prod | xargs)
docker compose -f docker-compose.prod.yml up -d --build frontend
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

**Backend tidak bisa connect ke Neon:**
```bash
# Cek DATABASE_URL format, pastikan ada ?sslmode=require
# Cek koneksi keluar dari container
docker compose -f docker-compose.prod.yml logs backend
docker exec navisha-backend wget -qO- https://neon.tech 2>&1 | head -5
```

**Frontend menampilkan API URL kosong / salah:**
```bash
# NEXT_PUBLIC_ vars harus sudah di-export SEBELUM docker compose up --build
# Verifikasi sebelum build:
echo $NEXT_PUBLIC_API_URL
echo $NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Jika salah, rebuild frontend dengan nilai yang benar:
export $(cat .env.prod | xargs)
docker compose -f docker-compose.prod.yml up -d --build frontend
```

**Frontend build gagal (npm ci):**
```bash
# Cek apakah package-lock.json sinkron dengan package.json
# Jalankan `npm install` lokal lalu commit package-lock.json yang baru
```

**Nginx 502 Bad Gateway:**
```bash
# Pastikan container jalan
docker compose -f docker-compose.prod.yml ps
# Cek port binding
sudo ss -tlnp | grep -E '3000|8090'
```

**Resource limit OOM (container restart loop):**
```bash
# Cek memory usage
docker stats --no-stream
# Lihat alasan restart
docker inspect navisha-backend | jq '.[0].State'
```

**View logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
sudo tail -f /var/log/nginx/error.log
```
