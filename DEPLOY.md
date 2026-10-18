# Deployment — navisha.cloud

Frontend di `navisha.cloud`, API di `api.navisha.cloud`. Database: Neon (PostgreSQL serverless, di luar VPS).

## Alur deploy

1. PR di-merge ke `main`.
2. Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) menjalankan CI, lalu membangun dan mendorong image `navisha-backend` dan `navisha-frontend` ke GHCR (`ghcr.io/jhontea/*`).
3. Job deploy SSH ke VPS, `git reset --hard origin/main`, `docker login ghcr.io`, lalu `docker compose -f docker-compose.prod.yml pull` dan `up -d --no-build`.

VPS **tidak pernah build image**. Deploy manual pun cukup mengulang langkah 3 di bagian [Deploy manual](#deploy-manual).

Deploy juga bisa dijalankan manual dari tab **Actions** → **Deploy to VPS** → **Run workflow**.

## Arsitektur

```
Internet
  │
  ▼
Nginx (TLS, reverse proxy) — konfigurasi: deploy/nginx/navisha.conf
  ├── navisha.cloud        → navisha-frontend  (127.0.0.1:3000)
  ├── api.navisha.cloud    → navisha-backend   (127.0.0.1:8090)
  │                              ├── redis-navisha (internal)
  │                              └── Neon PostgreSQL (eksternal)
  └── dozzle.navisha.cloud → navisha-dozzle    (127.0.0.1:8888)
```

Semua service didefinisikan di [`docker-compose.prod.yml`](docker-compose.prod.yml).

## Setup VPS (sekali)

1. Install Docker Engine dengan Compose v2, Nginx, dan Certbot.
2. Clone repo ke `/opt/navisha` memakai SSH key read-only (deploy key GitHub sudah cukup).
3. Pastikan `git fetch origin main` berjalan tanpa prompt, karena deploy memakai `git reset --hard`.
4. Pasang konfigurasi Nginx dari `deploy/nginx/navisha.conf`, lalu jalankan Certbot untuk domain `navisha.cloud`, `www.navisha.cloud`, `api.navisha.cloud`, dan `dozzle.navisha.cloud`.

## Konfigurasi

### Secrets di VPS

**`/opt/navisha/.env.deploy`** (dibaca workflow, tidak ikut container):

| Variabel     | Isi                                                          |
|--------------|--------------------------------------------------------------|
| `GHCR_USER`  | Username GitHub yang punya akses baca package                |
| `GHCR_TOKEN` | Token GitHub dengan izin baca package (GHCR)                 |

**`backend/.env`** (dibaca container backend lewat `env_file`): salin dari `backend/.env.example` dan isi nilai production. Daftar lengkap variabel ada di file itu. Yang wajib untuk production:

- `APP_ENV=production`, `TRUST_PROXY`, `SHARE_LINK_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `DATABASE_URL` dari Neon, dengan `?sslmode=require`
- `REDIS_URL=redis://redis:6379` (nama service Docker, bukan `localhost`)
- `FRONTEND_URL=https://navisha.cloud`, `COOKIE_DOMAIN=.navisha.cloud`
- Kredensial Google OAuth, serta API key peta, lokasi, dan LLM yang dipakai

Generate secret dengan `openssl rand -base64 48`.

### Build args frontend (GitHub, bukan VPS)

Variabel `NEXT_PUBLIC_*` dimasukkan saat image dibangun, jadi disimpan di **Settings → Secrets and variables → Actions** pada repo GitHub. Daftar lengkapnya ada di blok `build-args` di `deploy.yml`. Cukup cek di sana, jangan menyalin daftar ini ke dokumen lain.

### Layanan pihak ketiga

- **Google OAuth:** tambahkan redirect URI `https://api.navisha.cloud/api/v1/auth/google/callback`, dan origin `https://navisha.cloud` serta `https://www.navisha.cloud`.
- **Google Maps API key:** batasi ke HTTP referrer `https://navisha.cloud/*` dan `https://www.navisha.cloud/*`, dan batasi API ke Maps JavaScript API dan Places API. Key tetap terlihat di bundle JavaScript, jadi pembatasan domain ini wajib.
- **Cloudflare Cache Rule** untuk halaman publik:

  ```text
  (http.host eq "navisha.cloud" and http.request.method in {"GET" "HEAD"} and http.request.uri.path in {"/" "/privacy" "/terms" "/contact"})
  ```

  Set **Cache eligibility** ke `Eligible for cache` dan **Edge TTL** ke `Ignore cache-control header and use this TTL: 1 hour`. Jangan masukkan `/login`, `/share/*`, route dashboard, atau route API, karena respons-nya bisa bergantung pada cookie atau data pribadi.

## Deploy manual

Hanya dipakai jika workflow tidak bisa dijalankan. Image harus sudah ada di GHCR.

```bash
cd /opt/navisha
git fetch origin main && git reset --hard origin/main

set -a && source .env.deploy && set +a
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-build
docker image prune -f
```

Restart satu service saja: tambahkan nama service di akhir `up` (misalnya `backend`).

Cek status dan log:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

Migrasi database berjalan otomatis saat backend start. Tidak ada langkah migrasi terpisah.

## Keamanan

- Workflow deploy hanya berjalan dari `main`. Lindungi `main` dengan branch protection (PR dan review wajib).
- `VPS_SSH_KEY` dan `GHCR_TOKEN` adalah kredensial. Jangan pernah di-commit atau ditampilkan di log.
- Dozzle membaca Docker socket dan tidak punya autentikasi. Jangan dibuka ke publik. Versinya belum di-pin (`amir20/dozzle:latest`).

## Troubleshooting

**Deploy gagal di langkah login GHCR:** cek `GHCR_USER` dan `GHCR_TOKEN` di `/opt/navisha/.env.deploy`, dan pastikan token belum kedaluwarsa.

**Backend tidak bisa connect ke Redis:** pastikan `REDIS_URL=redis://redis:6379` dan service `redis` sehat (`docker compose -f docker-compose.prod.yml ps redis`).

**Backend tidak bisa connect ke Neon:** pastikan `DATABASE_URL` punya `?sslmode=require`. Cek log backend.

**Nginx 502 Bad Gateway:** pastikan container berjalan dan port `3000` / `8090` terikat di `127.0.0.1` (`sudo ss -tlnp | grep -E '3000|8090'`).

**Container restart terus (OOM):** cek `docker stats --no-stream` dan `docker inspect navisha-backend | jq '.[0].State'`.

**Log Nginx:** `sudo tail -f /var/log/nginx/error.log`.
