# Toko Laptop POS — Uber Design System

Project POS Kasir untuk Toko Laptop dengan **Uber Design System** (confident minimalism, black & white, pill-shaped interactions).

## 🎨 Design Philosophy

- **Black & White Universe**: Primary color #000000, white backgrounds
- **Pill-Shaped Buttons**: Semua buttons menggunakan `rounded-full`
- **Whisper Shadows**: Cards menggunakan shadow halus, bukan borders
- **DM Sans Font**: Single font family untuk semua text
- **Information Dense**: Compact layouts, efficient spacing

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
poskarisv2/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── ui/          # Shadcn/ui components (Uber style)
│   │   └── ...          # Custom components
│   └── lib/             # Utilities & helpers
├── DESIGN.md            # Uber Design System documentation
├── tokens.css           # Design tokens (colors, spacing, shadows)
└── supabase/            # Database schema & migrations
```

## 🎯 Features

### Modul Servis
- Input data servis laptop/komputer
- Tracking sparepart yang dipakai
- Generate nota PDF
- Kirim nota ke WhatsApp customer

### Modul Jual-Beli Unit
- Input pembelian unit laptop
- Input penjualan unit
- Track margin per unit
- Stock management otomatis

### Modul Stok
- Management inventory unit & sparepart
- Auto update saat transaksi
- Notifikasi stok menipis
- Riwayat mutasi stok

### Modul Operasional
- Input biaya operasional bulanan
- Kategori biaya (sewa, listrik, gaji, dll)

### Modul Laporan
- Laporan harian
- Laporan bulanan dengan laba bersih
- Export PDF & Excel
- Filter by periode

## 🎨 Design Components

### Buttons
```jsx
// Primary (Black pill)
<Button>Primary Action</Button>

// Secondary (White outline pill)
<Button variant="outline">Secondary</Button>

// Ghost
<Button variant="ghost">Ghost</Button>
```

### Cards
```jsx
// Card with whisper shadow
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Description here</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Inputs
```jsx
// Input with black border
<Input placeholder="Enter text..." />
```

### Badges
```jsx
// Status badges
<Badge>Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="info">Info</Badge>
```

## 🎨 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| primary | #000000 | Primary actions, headlines |
| secondary | #efefef | Chips, secondary buttons |
| background | #ffffff | Page background |
| surface-card | #ffffff | Card backgrounds |
| ink | #000000 | Body text |
| ash | #4b4b4b | Secondary text |
| stone | #afafaf | Disabled, placeholders |
| badge-success | #34d399 | Success states |
| badge-warning | #f59e0b | Warning states |
| danger | #dc2626 | Error/destructive |

## 📐 Spacing Scale (8px grid)

- `xxs`: 4px
- `xs`: 8px
- `sm`: 12px
- `md`: 16px (default)
- `lg`: 24px
- `xl`: 32px
- `xxl`: 48px
- `xxxl`: 64px

## 🔒 Role-Based Access

### Admin (Owner)
- Full access ke semua modul
- Manage users
- View all reports
- Export data

### Karyawan
- Access modul servis only
- Generate & send nota servis
- Input transaksi servis
- No access to financial reports

## 🗄️ Database (Supabase)

- PostgreSQL database
- Row Level Security (RLS) enabled
- Real-time subscriptions
- Edge functions for WhatsApp integration

## 📱 Responsive Design

- Mobile-first approach
- Sidebar collapses to hamburger on mobile
- Touch-friendly buttons (44px height)
- Optimized for tablet & desktop

## 🔧 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn/ui (Uber customized)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **PDF**: jsPDF / react-pdf
- **Charts**: Recharts
- **Icons**: Lucide React

## 📝 Design Rules

1. ✅ **WAJIB** pakai `shadow-card` di semua card (bukan border)
2. ✅ **WAJIB** `rounded-full` untuk semua buttons
3. ✅ **WAJIB** `rounded-lg` (8px) untuk cards & inputs
4. ❌ **DILARANG** pakai gradient
5. ❌ **DILARANG** pakai border di card (shadow only)
6. ✅ Font: DM Sans only (400/500/700)
7. ✅ Shadows: Max opacity 0.16
8. ✅ Layout: Information-dense, compact

## 🚢 Deployment

```bash
# Build production
npm run build

# Start production server
npm start
```

Deploy to Vercel, Netlify, atau platform lain yang support Next.js.

## 📄 License

Private project untuk internal use.

---

**Built with ❤️ using Uber Design System**
