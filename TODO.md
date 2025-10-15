# WordWyrm Migration & Development TODO

## Project Overview
Migrating from Django + Next.js + Supabase stack to a pure Next.js + Vercel Postgres solution. Building a multi-tenant education platform where teachers can upload PDFs, generate quizzes, and share games with students.

---

## Phase 1: Database & Environment Setup ✅

- [x] Initialize Prisma with PostgreSQL schema
- [x] Set up project structure with organized folders
- [x] Install core dependencies
- [ ] Set up Vercel project
- [ ] Create Vercel Postgres database
- [ ] Add environment variables to `.env.local`
- [ ] Run Prisma migrations (`npx prisma migrate dev`)
- [ ] Generate Prisma Client (`npx prisma generate`)
- [ ] Test database connection

**Environment Variables Needed:**
```
DATABASE_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
GEMINI_API_KEY="your-existing-gemini-key"
BLOB_READ_WRITE_TOKEN="vercel-blob-token"
```

---

## Phase 2: Authentication Infrastructure 🔨

### 2.1 NextAuth.js Configuration
- [ ] Create `lib/auth.ts` with NextAuth config
- [ ] Set up credentials provider
- [ ] Configure Prisma adapter
- [ ] Add password hashing utilities (bcryptjs)
- [ ] Create auth middleware for route protection
- [ ] Add role-based access control (RBAC)

### 2.2 Authentication Pages
- [ ] Create login page (`app/(auth)/login/page.tsx`)
- [ ] Create signup page (`app/(auth)/signup/page.tsx`)
- [ ] Add role selection during signup (Teacher/Student)
- [ ] Create auth server actions (`app/actions/auth.ts`)
- [ ] Add form validation with Zod
- [ ] Style with Tailwind + DaisyUI

---

## Phase 3: PDF Processing Pipeline 🔨

### 3.1 Vercel Blob Storage Setup
- [ ] Create `lib/blob.ts` with Vercel Blob helpers
- [ ] Test file upload to Blob storage
- [ ] Create file size validation (max 25MB)
- [ ] Add file type validation (PDF only)

### 3.2 PDF Text Extraction
- [ ] Create `lib/processors/pdf-processor.ts`
- [ ] Implement PDF text extraction using `pdf-parse`
- [ ] Add error handling for corrupted PDFs
- [ ] Test with sample PDFs from old project

### 3.3 Server Actions
- [ ] Create `app/actions/pdf.ts`
- [ ] Implement `uploadPDF` server action
  - Upload to Blob storage
  - Save PDF record to database
  - Trigger processing
- [ ] Implement `processPDF` server action
  - Extract text from PDF
  - Save to ProcessedContent table
  - Return extracted text
- [ ] Add loading states and error handling

---

## Phase 4: AI Quiz Generation 🔨

### 4.1 Gemini Integration
- [ ] Create `lib/processors/ai-generator.ts`
- [ ] Port `generateQuiz` function from Django (views.py:283-405)
- [ ] Port `generateFlashcards` function (views.py:167-280)
- [ ] Port `generateSummary` function (views.py:48-100)
- [ ] Port `generateKeypoints` function (views.py:103-164)
- [ ] Use `@google/generative-ai` package
- [ ] Add retry logic for API failures

### 4.2 Quiz Server Actions
- [ ] Create `app/actions/quiz.ts`
- [ ] Implement `generateQuizFromPDF` server action
  - Process PDF
  - Call Gemini API
  - Parse JSON response
  - Save Quiz to database
- [ ] Add validation for quiz JSON structure
- [ ] Handle edge cases (empty PDFs, API errors)

---

## Phase 5: Game Management 🔨

### 5.1 Share Code & QR Code Generation
- [ ] Create `lib/utils/share-code.ts`
- [ ] Implement unique 6-character code generation
- [ ] Add collision detection/retry logic
- [ ] Create `lib/utils/qr-code.ts`
- [ ] Implement QR code generation using `qrcode` package
- [ ] Upload QR codes to Vercel Blob storage

### 5.2 Game Server Actions
- [ ] Create `app/actions/game.ts`
- [ ] Implement `createGame` server action
  - Generate share code
  - Generate QR code
  - Create Game record
  - Return game link + QR URL
- [ ] Implement `toggleGameActive` (enable/disable)
- [ ] Implement `getGameDetails`
- [ ] Implement `getGameResults` (for teacher analytics)

---

## Phase 6: Teacher Dashboard 🔨

### 6.1 Upload Interface
- [ ] Create teacher layout (`app/(teacher)/layout.tsx`)
- [ ] Build upload page (`app/(teacher)/upload/page.tsx`)
- [ ] Reuse `FileUpload` component from old frontend
- [ ] Add drag-and-drop support
- [ ] Show upload progress
- [ ] Display processing status
- [ ] Auto-redirect to game creation after processing

### 6.2 Dashboard
- [ ] Create dashboard page (`app/(teacher)/dashboard/page.tsx`)
- [ ] Display uploaded PDFs list
- [ ] Show generated games list
- [ ] Add quick actions (create game, view results)
- [ ] Add search/filter functionality

### 6.3 Game Management
- [ ] Create games list page (`app/(teacher)/games/page.tsx`)
- [ ] Create game details page (`app/(teacher)/games/[gameId]/page.tsx`)
- [ ] Display share code and QR code
- [ ] Show live student participation
- [ ] Display results/analytics
- [ ] Add export results functionality

---

## Phase 7: Student Experience 🔨

### 7.1 Game Join Flow
- [ ] Create public game page (`app/play/[shareCode]/page.tsx`)
- [ ] Handle anonymous access (logged in or guest)
- [ ] Display game title and description
- [ ] Show "Start Game" button
- [ ] Add time limit countdown if applicable

### 7.2 Quiz Player
- [ ] Create quiz playing interface
- [ ] Display questions one at a time
- [ ] Track answers in state
- [ ] Add progress indicator
- [ ] Implement timer if game has time limit
- [ ] Submit answers to server

### 7.3 Results & History
- [ ] Create student dashboard (`app/(student)/dashboard/page.tsx`)
- [ ] Display completed games
- [ ] Show scores and feedback
- [ ] Create history page (`app/(student)/history/page.tsx`)
- [ ] Allow reviewing past attempts

---

## Phase 8: UI Components 🔨

### 8.1 Shared Components
- [ ] Create `components/shared/LoadingSpinner.tsx`
- [ ] Create `components/shared/ErrorMessage.tsx`
- [ ] Create `components/shared/Button.tsx`
- [ ] Create `components/shared/Card.tsx`
- [ ] Create `components/shared/Modal.tsx`

### 8.2 Teacher Components
- [ ] Create `components/teacher/PDFCard.tsx`
- [ ] Create `components/teacher/GameCard.tsx`
- [ ] Create `components/teacher/QRCodeDisplay.tsx`
- [ ] Create `components/teacher/AnalyticsDashboard.tsx`

### 8.3 Student Components
- [ ] Create `components/student/QuizQuestion.tsx`
- [ ] Create `components/student/QuizResults.tsx`
- [ ] Create `components/student/GameHistory.tsx`

---

## Phase 9: API Routes 🔨

### 9.1 Authentication API
- [ ] Create `/api/auth/[...nextauth]/route.ts`
- [ ] Handle NextAuth callbacks

### 9.2 Game APIs
- [ ] Create `/api/game/[gameId]/join/route.ts`
- [ ] Create `/api/game/[gameId]/submit/route.ts`
- [ ] Create `/api/game/[gameId]/results/route.ts`

---

## Phase 10: Middleware & Protection 🔨

- [ ] Create `middleware.ts`
- [ ] Add authentication checks
- [ ] Implement role-based route protection
  - Teacher routes: `/teacher/*`
  - Student routes: `/student/*`
  - Public routes: `/play/*`, `/login`, `/signup`
- [ ] Add redirect logic

---

## Phase 11: Testing & Validation 🧪

### 11.1 Manual Testing
- [ ] Test teacher signup/login
- [ ] Test student signup/login
- [ ] Test PDF upload (small, large, invalid files)
- [ ] Test quiz generation
- [ ] Test game creation and sharing
- [ ] Test student joining game via share code
- [ ] Test quiz playing and submission
- [ ] Test results tracking

### 11.2 Edge Cases
- [ ] Handle corrupted PDFs
- [ ] Handle Gemini API rate limits
- [ ] Handle duplicate share codes
- [ ] Handle network failures
- [ ] Test with 100 concurrent users

---

## Phase 12: Deployment 🚀

### 12.1 Vercel Deployment
- [ ] Push code to GitHub
- [ ] Connect GitHub repo to Vercel
- [ ] Configure environment variables
- [ ] Set up Vercel Postgres
- [ ] Set up Vercel Blob storage
- [ ] Run Prisma migrations in production
- [ ] Test production deployment

### 12.2 Post-Deployment
- [ ] Test all flows in production
- [ ] Set up monitoring/logging
- [ ] Configure custom domain (optional)
- [ ] Set up analytics (Vercel Analytics)

---

## Phase 13: Future Enhancements 🚀

### Stretch Goals
- [ ] Add flashcards generation
- [ ] Add summary generation
- [ ] Add keypoints generation
- [ ] Implement real-time game updates (WebSockets)
- [ ] Add leaderboards
- [ ] Add teacher comments on student performance
- [ ] Add PDF annotation/highlighting
- [ ] Support multiple file formats (DOCX, TXT)
- [ ] Add email notifications
- [ ] Add mobile app (React Native)

---

## Migration Checklist

### Data Migration (if needed)
- [ ] Export any existing data from Django/Supabase
- [ ] Transform data to new schema
- [ ] Import into Vercel Postgres

### Code Migration
- [x] Extract PDF processing logic from `backend-wordwyrm/django_backend/api/views.py:12-45`
- [ ] Port to `lib/processors/pdf-processor.ts`
- [x] Extract AI generation logic from `backend-wordwyrm/django_backend/api/views.py:48-405`
- [ ] Port to `lib/processors/ai-generator.ts`
- [ ] Reuse frontend components from `wordwyrm-frontend/src/components/`
- [ ] Adapt to new server actions architecture

---

## Current Priorities

**Week 1:**
1. Set up Vercel project & database
2. Complete authentication (Phase 2)
3. Set up PDF processing (Phase 3)

**Week 2:**
4. Implement quiz generation (Phase 4)
5. Build teacher upload interface (Phase 6.1)
6. Implement game management (Phase 5)

**Week 3:**
7. Build student game experience (Phase 7)
8. Complete UI components (Phase 8)
9. Testing & bug fixes (Phase 11)

**Week 4:**
10. Deploy to Vercel (Phase 12)
11. User testing
12. Launch! 🎉

---

## Notes

- Keep the architecture modular - easy to add new AI features later
- Focus on teacher MVP first (upload → quiz → share)
- Student experience can be simpler initially
- Use Server Actions for most operations (simpler than API routes)
- Leverage Vercel's edge network for fast global performance
- Monitor Gemini API costs and add rate limiting if needed

---

**Last Updated:** October 15, 2025
