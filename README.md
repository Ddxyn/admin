# Day Sawit Web Admin Dashboard

Dashboard operasional untuk pencatatan harian kebun sawit, monitoring pemasukan dan pengeluaran, pengelolaan petugas, serta pembuatan laporan PDF/CSV.

## Fitur

- Dashboard ringkasan harian, mingguan, dan bulanan.
- Input data harian: tonase supir, tandan pemanen, harga per kg, dan pengeluaran.
- Laporan dengan grafik tren, rincian pengeluaran, export PDF, export CSV, dan print.
- Role-based access control untuk admin, petugas, dan visitor.
- Manajemen akun petugas oleh admin.
- Session tracking, cookie HTTP-only, JWT signing, dan audit activity log.
- Supabase PostgreSQL schema dengan view agregasi laporan.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS 4
- Supabase PostgreSQL
- Recharts
- jsPDF dan jsPDF AutoTable
- Jose JWT dan bcryptjs
- ESLint flat config

## Quick Start

```bash
git clone https://github.com/Ddxyn/admin.git
cd admin
npm install
cp .env.example .env.local
npm run dev
```

Development server berjalan di `http://localhost:3000`.

## Environment Variables

Isi `.env.local` dengan nilai dari Supabase dan secret aplikasi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-random-secret-minimum-32-characters
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Database Setup

1. Buat project di Supabase.
2. Buka SQL Editor.
3. Jalankan isi file `supabase/schema.sql`.
4. Salin URL, anon key, dan service role key ke `.env.local`.

Catatan: `SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai di server. Jangan expose key ini ke client atau commit file `.env.local`.

## Available Scripts

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run build` | Production build dan type-check |
| `npm start` | Menjalankan production server |
| `npm run lint` | ESLint dengan zero warnings |

## Quality Gates

Project ini sudah disiapkan agar mudah dinilai dan dimaintain:

- `npm run lint` wajib bersih.
- `npm run build` wajib sukses.
- GitHub Actions menjalankan install, lint, audit production, dan build.
- Build tidak membutuhkan Supabase secret karena client database dibuat lazy pada runtime.
- `JWT_SECRET` tidak memiliki fallback insecure.

## Deployment

Target paling sederhana adalah Vercel:

1. Import repository ke Vercel.
2. Set semua environment variables yang tercantum di atas.
3. Deploy.
4. Buka aplikasi dan buat akun admin pertama lewat halaman register admin.

## Security Notes

- Cookie session memakai `httpOnly`, `sameSite=lax`, dan `secure` di production.
- Admin dapat mengelola petugas dan hanya satu admin yang diizinkan oleh schema database.
- API route tetap melakukan authorization check walaupun route UI diproteksi proxy.
- Audit log mencatat login, registrasi admin, perubahan user, dan mutasi data harian.

## License

MIT. Lihat file `LICENSE`.
