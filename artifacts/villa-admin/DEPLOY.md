# Deploy ke Cloudflare Pages

## Persiapan

Pastikan sudah punya akun [Cloudflare](https://dash.cloudflare.com) dan repository sudah di-push ke GitHub/GitLab.

---

## Cara Deploy

### 1. Build lokal dulu (opsional — untuk test)

```bash
pnpm --filter @workspace/villa-admin run build:cf
```

Output ada di: `artifacts/villa-admin/dist/public/`

---

### 2. Setup di Cloudflare Pages

Masuk ke **Cloudflare Dashboard → Pages → Create a project → Connect to Git**

Pilih repo kamu, lalu isi konfigurasi build:

| Setting | Nilai |
|---|---|
| **Framework preset** | None |
| **Build command** | `pnpm --filter @workspace/villa-admin run build:cf` |
| **Build output directory** | `artifacts/villa-admin/dist/public` |
| **Root directory** | *(kosongin — biarkan default root repo)* |
| **Node.js version** | `20` |

---

### 3. Environment Variables (di Cloudflare Pages)

Pergi ke **Settings → Environment variables** dan tambahkan:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `BASE_PATH` | `/` |

> **Catatan**: `PORT` tidak perlu diset — hanya dibutuhkan untuk mode development.

---

### 4. SPA Routing

File `public/_redirects` sudah ada dan berisi:
```
/* /index.html 200
```
Ini memastikan semua route (seperti `/bookings`, `/chat`, dll) diarahkan ke `index.html` agar React Router bisa menangani navigasi.

---

### 5. PWA (Progressive Web App)

Aplikasi ini sudah PWA-ready:
- Service worker otomatis di-generate saat build
- Manifest terpasang — bisa di-install ke homescreen HP
- Caching API otomatis (offline support dasar)
- Theme color & splash screen sudah dikonfigurasi

---

## Catatan Penting

- **API endpoint** (`villa.cocspedsafliz.workers.dev`) sudah terhardcode — tidak perlu env var tambahan
- Build tidak butuh database atau server — ini **static site** murni
- Setiap push ke branch `main` akan otomatis redeploy (jika GitHub integration aktif)

---

## Troubleshooting

**Build gagal karena PORT not set?**
Pastikan `NODE_ENV=production` sudah ditambahkan ke environment variables Cloudflare.

**Halaman 404 saat refresh?**
Pastikan file `_redirects` ada di `public/` dan ikut ter-build ke output directory.

**PWA tidak bisa di-install?**
Buka DevTools → Application → Manifest. Pastikan semua field terisi dan icon ter-load.
