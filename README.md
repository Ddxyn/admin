# Day Sawit Web Admin Dashboard

Admin dashboard application untuk manajemen data dan pelaporan dengan antarmuka modern dan responsif.

## 📋 Deskripsi Project

**Day Sawit Web** adalah aplikasi web admin yang dibangun dengan teknologi modern untuk memudahkan pengelolaan data, visualisasi informasi, dan pembuatan laporan. Aplikasi ini menggunakan Next.js sebagai framework utama dengan integrasi Supabase untuk backend database.

### Fitur Utama
- 📊 **Dashboard Analytics** - Visualisasi data real-time dengan Recharts
- 📄 **Export Reports** - Ekspor data ke format PDF dan Excel
- 🔐 **Authentication** - Sistem autentikasi yang aman dengan JWT dan bcrypt
- 🎨 **Modern UI** - Interface yang responsif menggunakan Tailwind CSS
- 📱 **Responsive Design** - Kompatibel dengan desktop, tablet, dan mobile
- 🔔 **Toast Notifications** - Feedback visual menggunakan React Hot Toast

## 🛠️ Teknologi yang Digunakan

### Frontend
- **Next.js 16.2.6** - React framework untuk production
- **React 19** - UI library
- **TypeScript** - Type safety dan development experience yang lebih baik
- **Tailwind CSS 4.3** - Utility-first CSS framework
- **Lucide React** - Icon library

### Data & Analytics
- **Recharts 3.8.1** - Charting library untuk visualisasi data
- **jsPDF 4.2.1** - PDF generation
- **jsPDF AutoTable 5.0.7** - Tabel otomatis di PDF
- **XLSX 0.18.5** - Excel file manipulation

### Backend & Database
- **Supabase JS 2.105.4** - Backend sebagai service dengan PostgreSQL
- **Date-fns 4.1.0** - Date manipulation utilities

### Security & Auth
- **Jose 6.2.3** - JWT (JSON Web Token) handling
- **bcryptjs 3.0.3** - Password hashing
- **Next.js ESLint** - Code quality & linting

### Developer Tools
- **Autoprefixer** - CSS vendor prefixing
- **PostCSS** - CSS processing
- **ESLint** - JavaScript/TypeScript linting

## 📊 Komposisi Bahasa

- **TypeScript**: 97.3% - Bahasa utama project
- **CSS**: 2.2% - Styling
- **JavaScript**: 0.5% - Configuration files

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm atau yarn

### Installation

```bash
# Clone repository
git clone https://github.com/Ddxyn/admin.git
cd admin

# Install dependencies
npm install
```

### Development

```bash
# Run development server
npm run dev
```

Server akan berjalan di `http://localhost:3000`

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Linting

```bash
# Check code quality
npm run lint
```

## 📁 Project Structure

```
admin/
├── app/              # Next.js app directory
├── components/       # React components
├── pages/           # Page components
├── styles/          # CSS dan Tailwind styles
├── utils/           # Utility functions
├── lib/             # Library functions
├── public/          # Static assets
├── package.json     # Project dependencies
└── tsconfig.json    # TypeScript configuration
```

## 🔧 Configuration

### Environment Variables

Buat file `.env.local` di root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### TypeScript

Configuration dapat disesuaikan di `tsconfig.json`

## 📦 Available Scripts

| Script | Deskripsi |
|--------|-----------|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk production |
| `npm start` | Jalankan production server |
| `npm run lint` | Jalankan ESLint untuk code quality |

## 🔐 Security Notes

- Passwords di-hash menggunakan bcryptjs
- JWT tokens digunakan untuk session management
- Supabase menyediakan row-level security (RLS)
- Semua API calls harus authenticated

## 🤝 Contributing

Kontribusi dipersilakan! Untuk kontribusi besar, silakan buka issue terlebih dahulu untuk diskusi.

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

## 📝 License

Project ini dirilis sebagai proyek open-source di bawah lisensi MIT. Silakan menggunakan, mempelajari, memodifikasi, dan mendistribusikan project ini sesuai ketentuan lisensi.


## 👤 Author

**Ddxyn** - [GitHub Profile](https://github.com/Ddxyn)

## 📧 Support

Untuk pertanyaan atau issue, silakan buka GitHub Issues atau hubungi author.

---

**Last Updated**: 2026-06-02
