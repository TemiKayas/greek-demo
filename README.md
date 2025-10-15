# WordWyrm 🐉

An AI-powered education platform that transforms PDFs into interactive quizzes. Teachers upload study materials, generate quiz games, and share them with students via QR codes or links.

## Features

- **PDF Processing**: Upload PDFs up to 25MB, automatically extract text
- **AI Quiz Generation**: Generate multiple-choice quizzes using Google Gemini
- **Game Sharing**: Create shareable quiz games with QR codes
- **Student Tracking**: Monitor student performance and progress
- **Role-Based Access**: Separate experiences for teachers and students

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Vercel Postgres (PostgreSQL)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **File Storage**: Vercel Blob Storage
- **AI**: Google Gemini API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- Vercel account (for deployment)
- Google Gemini API key

### 1. Clone & Install

```bash
cd wordwyrm
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Database (Get these from Vercel Postgres)
DATABASE_URL="postgres://default:xxx@xxx.us-east-1.postgres.vercel-storage.com:5432/verceldb"
POSTGRES_PRISMA_URL="postgres://default:xxx@xxx.us-east-1.postgres.vercel-storage.com:5432/verceldb?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://default:xxx@xxx.us-east-1.postgres.vercel-storage.com:5432/verceldb"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Google Gemini API
GEMINI_API_KEY="your-gemini-api-key-here"

# Vercel Blob Storage (Get this from Vercel)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxx"
```

#### Where to Find Environment Variables

##### Database URLs (Vercel Postgres)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new project or select existing
3. Go to **Storage** tab
4. Click **Create Database** → **Postgres**
5. After creation, go to **Settings** → **.env.local** tab
6. Copy all `POSTGRES_*` variables

##### NextAuth Secret
Generate a secure secret:
```bash
openssl rand -base64 32
```
Or use: https://generate-secret.vercel.app/32

##### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **Get API Key**
3. Create new API key or use existing
4. Copy the key

##### Blob Storage Token
1. In Vercel Dashboard, go to **Storage** tab
2. Click **Create Database** → **Blob**
3. After creation, copy the `BLOB_READ_WRITE_TOKEN`

### 3. Database Setup

Initialize and migrate your database:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# Optional: Open Prisma Studio to view database
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create Your First Account

1. Navigate to `/signup`
2. Choose **Teacher** role
3. Create account and log in
4. Upload a PDF and generate a quiz!

## Project Structure

```
wordwyrm/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (teacher)/         # Teacher dashboard
│   │   ├── dashboard/
│   │   ├── upload/
│   │   └── games/
│   ├── (student)/         # Student dashboard
│   │   ├── dashboard/
│   │   └── history/
│   ├── play/              # Public game pages
│   ├── actions/           # Server Actions
│   └── api/               # API Routes
├── components/            # React Components
│   ├── auth/
│   ├── teacher/
│   ├── student/
│   └── shared/
├── lib/                   # Utilities & Config
│   ├── auth.ts           # NextAuth config
│   ├── db.ts             # Prisma client
│   ├── blob.ts           # Vercel Blob helpers
│   ├── processors/       # Business logic
│   │   ├── pdf-processor.ts
│   │   └── ai-generator.ts
│   └── utils/            # Utility functions
├── prisma/               # Database schema
│   └── schema.prisma
├── public/               # Static assets
└── types/                # TypeScript types
```

## Development Workflow

### Making Database Changes

1. Edit `prisma/schema.prisma`
2. Create migration:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```
3. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

### Adding New Features

1. Check `TODO.md` for planned features
2. Create necessary database models in `schema.prisma`
3. Write Server Actions in `app/actions/`
4. Create UI components in `components/`
5. Add pages in `app/`

### Testing Locally

1. Create test accounts (teacher + student)
2. Upload sample PDFs (find test PDFs in old project)
3. Generate quizzes
4. Create games
5. Test student flow with share codes

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import repository in [Vercel](https://vercel.com/new)
3. Configure environment variables in Vercel dashboard
4. Deploy!

Vercel will automatically:
- Install dependencies
- Run build
- Deploy to edge network

### Post-Deployment Setup

1. **Run Database Migrations:**
   ```bash
   vercel env pull .env.local  # Pull production env vars
   npx prisma migrate deploy   # Run migrations in production
   ```

2. **Test Production:**
   - Sign up as teacher
   - Upload PDF
   - Generate quiz
   - Create game
   - Test student flow

3. **Set Up Monitoring:**
   - Enable Vercel Analytics
   - Monitor Function logs
   - Check error rates

## Environment Variables Reference

| Variable | Description | Required | Where to Get |
|----------|-------------|----------|--------------|
| `DATABASE_URL` | Main database connection | ✅ | Vercel Postgres |
| `POSTGRES_PRISMA_URL` | Prisma connection with pooling | ✅ | Vercel Postgres |
| `POSTGRES_URL_NON_POOLING` | Direct connection (for migrations) | ✅ | Vercel Postgres |
| `NEXTAUTH_URL` | Your app URL | ✅ | `http://localhost:3000` (dev) or your domain (prod) |
| `NEXTAUTH_SECRET` | Auth secret key | ✅ | Generate with `openssl rand -base64 32` |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | ✅ | Vercel Blob Storage dashboard |

## Useful Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npx prisma studio              # Open database GUI
npx prisma migrate dev         # Create and apply migration
npx prisma migrate deploy      # Apply migrations (production)
npx prisma generate            # Generate Prisma Client
npx prisma db push             # Push schema without migration (dev only)
npx prisma db seed             # Run seed script
```

### Vercel
```bash
vercel                         # Deploy to preview
vercel --prod                  # Deploy to production
vercel env pull .env.local     # Pull environment variables
vercel logs                    # View deployment logs
```

## Troubleshooting

### "Prisma Client not found"
```bash
npx prisma generate
```

### "Cannot connect to database"
- Check `DATABASE_URL` in `.env.local`
- Ensure Vercel Postgres is provisioned
- Try using `POSTGRES_URL_NON_POOLING` instead

### "NextAuth configuration error"
- Ensure `NEXTAUTH_URL` matches your current URL
- Regenerate `NEXTAUTH_SECRET`
- Clear browser cookies

### "Gemini API error"
- Verify `GEMINI_API_KEY` is correct
- Check API quota in Google Cloud Console
- Ensure billing is enabled (if required)

### "Blob upload failed"
- Verify `BLOB_READ_WRITE_TOKEN` is set
- Check file size (max 25MB)
- Ensure Vercel Blob storage is provisioned

### Build fails on Vercel
- Check build logs
- Ensure all environment variables are set
- Try building locally: `npm run build`

## Migrating from Old Project

If you have data from the previous Django + Supabase setup:

1. **Export Data:**
   - Export PDFs from Supabase Storage
   - Export database records to JSON/CSV

2. **Transform Data:**
   - Map old schema to new Prisma schema
   - Update references and IDs

3. **Import Data:**
   - Use Prisma Client to insert data
   - Upload PDFs to Vercel Blob
   - Update blob URLs in database

See `CLAUDE.md` for detailed migration scripts.

## Documentation

- **TODO.md**: Detailed development roadmap and tasks
- **CLAUDE.md**: Technical implementation notes and patterns
- **README.md**: This file - setup and usage guide

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://authjs.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Support

For questions or issues:
- Check `TODO.md` for planned features
- Read `CLAUDE.md` for implementation details
- Review Vercel logs for errors
- Check Prisma Studio for database issues

## License

MIT

---

**Built with ❤️ using Next.js, Prisma, and Google Gemini**
