# Studyspace — Reminder Task untuk Mahasiswa

Planner tugas untuk mahasiswa undergraduate: input tugas, checklist selesai, tandai deadline,
kelompokkan per mata kuliah, lengkap dengan autentikasi dan penyimpanan persisten.

Aplikasi ini punya **dua mode database**, jadi bisa dipakai lokal maupun di-deploy ke GitHub Pages
tanpa menyewa server database.

---

## 1. Struktur folder

```
├── src/
│   ├── app/
│   │   ├── api/                  # Route handler Next.js (hanya dipakai di mode server)
│   │   │   ├── auth/route.ts     # register / login / logout / demo
│   │   │   ├── bootstrap/route.ts # ambil user + courses + tasks sekaligus
│   │   │   ├── courses/route.ts  # create course
│   │   │   ├── courses/[id]/      # update & delete course
│   │   │   ├── tasks/route.ts    # create task
│   │   │   ├── tasks/[id]/        # update (incl. checklist) & delete task
│   │   │   └── health/route.ts   # cek koneksi + deteksi mode storage
│   │   ├── globals.css           # seluruh desain (Tailwind + CSS kustom)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── dashboard.tsx         # shell aplikasi: sidebar, task table, optimistic update
│   │   ├── calendar-panel.tsx    # kalender bulanan + upcoming deadlines
│   │   └── modals.tsx            # form task/course/auth/konfirmasi hapus
│   ├── db/
│   │   ├── index.ts              # koneksi Drizzle + Pool PostgreSQL
│   │   └── schema.ts             # definisi tabel (users, sessions, courses, tasks)
│   └── lib/
│       ├── auth.ts               # hash password (scrypt) + session cookie
│       ├── data/
│       │   ├── index.ts          # pemilih store: server atau local
│       │   ├── server.ts         # adapter yang memanggil route handler
│       │   ├── local.ts          # adapter database lokal di browser
│       │   └── types.ts          # interface Store (satu kontrak untuk dua mode)
│       ├── demo-data.ts          # data demo yang dipakai kedua mode
│       ├── seed.ts               # seeding demo workspace di PostgreSQL
│       ├── validation.ts         # validasi input (dipakai API)
│       └── dates.ts              # helper tanggal
├── scripts/
│   ├── build-static.mjs          # build statis tanpa route handler
│   └── serve-static.mjs          # preview hasil build statis
├── drizzle.config.json
└── next.config.ts
```

## 2. Dua mode database

UI memakai satu kontrak data (`src/lib/data/types.ts`), jadi tidak ada kode yang perlu diubah
saat berpindah mode. Mode dipilih otomatis saat aplikasi start:

| | Mode A — Full-stack (lokal) | Mode B — Static (GitHub Pages) |
|---|---|---|
| Pemicu | `npm run dev` / `npm run build && npm start` | `npm run build:static` |
| Penyimpanan | PostgreSQL di mesin sendiri | Database lokal di browser (localStorage) |
| Route handler | dipakai (`/api/*`) | tidak ada (hanya file statis) |
| Cocok untuk | dipakai harian, multi-perangkat bila DB-nya dibagikan | portofolio/demo publik di GitHub |

Deteksi mode: aplikasi memanggil `/api/health`. Kalau jawabannya OK → memakai PostgreSQL.
Kalau tidak ada (hosting statis) → otomatis pakai database lokal di browser.
Mode bisa dipaksa lewat env `NEXT_PUBLIC_STORAGE=local`.

### Struktur Mode A — PostgreSQL (Drizzle)

```
users
  id           uuid  PK
  name         varchar(80)
  email        varchar(255) UNIQUE
  password_hash text          -- scrypt: salt:hash
  is_demo      boolean
  created_at   timestamptz

sessions
  id           uuid  PK
  user_id      uuid  FK -> users.id (ON DELETE CASCADE)
  token_hash   varchar(64) UNIQUE   -- sha256 dari token di cookie
  expires_at   timestamptz

courses
  id           uuid  PK
  user_id      uuid  FK -> users.id (ON DELETE CASCADE)
  name         varchar(80)
  color        varchar(20)
  created_at   timestamptz

tasks
  id           uuid  PK
  user_id      uuid  FK -> users.id (ON DELETE CASCADE)
  course_id    uuid  FK -> courses.id (ON DELETE SET NULL)
  title        varchar(160)
  notes        text
  due_date     date              -- deadline
  due_time     varchar(5)        -- jam (opsional)
  priority     varchar(10)       -- low | medium | high
  completed    boolean           -- checklist
  created_at   timestamptz
```

Semua query dibatasi `user_id` dari session, jadi data antar user tidak salingAccessible.

### Struktur Mode B — Database lokal di browser

Semua data disimpan di satu dokumen JSON pada `localStorage`:

```
Key   : studyspace.local.v1        (dokumen database)
Key   : studyspace.local.session   (token session aktif)

{
  "users":    [ { id, name, email, passwordHash, isDemo, createdAt } ],
  "sessions": [ { token, userId, expiresAt } ],
  "courses":  [ { id, userId, name, color, createdAt } ],
  "tasks":    [ { id, userId, courseId, title, notes, dueDate, dueTime,
                  priority, completed, createdAt } ],
  "demoSeeded": boolean
}
```

Konsepnya sama persis dengan tabel di atas, hanya bentuknya satu file JSON per browser.
Password di-hash (SHA-256 + salt) sebelum disimpan, dan session punya masa berlaku 30 hari.
Data tidak keluar dari perangkat/browser pengguna, dan bisa dihapus lewat
`localStorage.clear()` di DevTools.

## 3. Menjalankan secara lokal (Mode A)

```bash
npm install
cp .env.example .env          # sesuaikan DATABASE_URL bila perlu
npm run db:push               # membuat tabel di PostgreSQL lokal
npm run dev                   # http://localhost:3000
```

Saat pertama dibuka, aplikasi otomatis membuat **demo workspace** (4 mata kuliah + 9 tugas)
lengkap dengan akun demo. Task yang dibuat bisa ditandai selesai (optimistic update),
diubah, dihapus, dicari, difilter per tanggal, dan dikelompokkan per mata kuliah.
Buat akun untuk menyimpan workspace tersebut secara permanen.

## 4. Deploy ke GitHub Pages (Mode B)

GitHub Pages hanya bisa menyajikan file statis, jadi API/server dimatikan dan datanya
pindah ke browser.

```bash
npm run build:static          # menghasilkan folder out/
npm run preview:static        # cek hasilnya di http://127.0.0.1:4173
```

Workflow `.github/workflows/deploy.yml` sudah disiapkan: push ke branch `main` → build →
upload ke GitHub Pages. Yang perlu disiapkan di repo:

1. **Settings → Pages → Source: GitHub Actions**
2. Repo harus branch `main`.
3. Untuk *project page* (`https://<user>.github.io/<repo>`) base path otomatis mengikuti nama repo.
   Untuk *user page* (`https://<user>.github.io`) isi repository variable
   `BASE_PATH` dengan nilai kosong.

Struktur yang ter-deploy:

```
out/
├── index.html
├── _next/static/...      # asset Next.js
└── images/study-hero.jpg
```

## 5. Catatan

- Data Mode B hanya ada di browser yang dipakai. Membersihkan data situs akan menghapusnya —
  gunakan "Buat akun" bila ingin workspace yang lebih permanen di perangkat itu.
- Mode A butuh PostgreSQL lokal yang sedang berjalan; tanpa itu `npm run db:push` gagal.
- `npm run lint` untuk mengecek gaya kode, `npm run typecheck` untuk cek tipe.
