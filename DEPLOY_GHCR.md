# Deployment dengan GitHub Actions + GHCR

Dengan konfigurasi ini, GitHub Actions melakukan build image backend dan frontend. VPS hanya melakukan pull image dan menjalankan container.

## 1. Tambahkan GitHub Actions variables

Buka `Settings > Secrets and variables > Actions > Variables`, lalu tambahkan jika ingin mengganti nilai default:

```text
NEXT_PUBLIC_API_URL=https://api.navisha.cloud/api/v1
NEXT_PUBLIC_LOCATION_PROVIDER=geoapify
NEXT_PUBLIC_MAP_PROVIDER=maplibre
NEXT_PUBLIC_LOCATION_PHOTOS_ENABLED=false
NEXT_PUBLIC_MAP_TILE_URL=/api/map-tiles/{z}/{x}/{y}
NEXT_PUBLIC_MAP_ATTRIBUTION=OpenStreetMap contributors CARTO
```

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` hanya perlu ditambahkan jika mode Google Maps digunakan. Nilai `NEXT_PUBLIC_*` masuk ke bundle browser, jadi jangan simpan secret backend di sini.

Workflow memakai `GITHUB_TOKEN` bawaan GitHub untuk push ke GHCR. Tidak perlu membuat PAT untuk GitHub Actions.

## 2. Buat token untuk VPS

Buat **Personal Access Token (classic)** di GitHub dengan scope:

```text
read:packages
```

Simpan token tersebut di VPS, bukan di repository. Jalankan di VPS:

```bash
cd /opt/navisha
touch .env.deploy
chmod 600 .env.deploy
nano .env.deploy
```

Isi:

```env
GHCR_USER=jhontea
GHCR_TOKEN=ghp_ganti_dengan_token_anda
```

File `backend/.env` tetap harus berisi konfigurasi production seperti database, JWT, OAuth, Redis, dan API key backend.

## 3. Pastikan Docker Compose terbaru ada di VPS

```bash
cd /opt/navisha
git pull origin main
docker compose version
```

Repository ini harus berada di `/opt/navisha`, sesuai konfigurasi workflow.

## 4. Commit dan push perubahan

Setelah perubahan ini masuk ke branch `main`, GitHub Actions akan menjalankan urutan:

1. Test backend.
2. Lint dan build frontend.
3. Build image backend di GitHub Actions.
4. Build image frontend di GitHub Actions.
5. Push kedua image ke GHCR dengan tag commit SHA dan `latest`.
6. SSH ke VPS.
7. Pull image dengan tag commit tersebut.
8. Restart container tanpa build.

## 5. Verifikasi deployment pertama

Setelah workflow pertama berhasil, verifikasi dari VPS dengan:

```bash
cd /opt/navisha
source .env.deploy
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
export IMAGE_TAG=latest
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-build
docker compose -f docker-compose.prod.yml ps
```

Biasanya tidak perlu langkah ini karena workflow akan melakukan deployment otomatis setelah push ke `main`.

## 6. Rollback

Cari tag commit sebelumnya di GHCR, lalu jalankan di VPS:

```bash
cd /opt/navisha
export IMAGE_TAG=COMMIT_SHA_SEBELUMNYA
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-build
```

Jangan menghapus image yang sedang digunakan. `docker image prune -f` hanya membersihkan image yang tidak lagi direferensikan.
