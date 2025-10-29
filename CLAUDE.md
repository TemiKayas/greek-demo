# Claude Implementation Notes

This file contains technical notes, patterns, and gotchas for Claude (or any developer) working on Greek Demo (formerly WordWyrm).

---

## Product Overview

**Production MVP:** A multi-tenant education platform where teachers create classes, upload PDFs, generate AI-powered learning materials (flashcards, worksheets, summaries), and share them with students. Students join classes via invite codes, access materials, use an AI chatbot, and track their learning. **Key differentiator:** Teachers can view all student chat histories to identify common questions and struggles.

---

## Architecture Decisions

### Why Next.js Only (No Django)?

**Original Stack:** Django + Next.js + Supabase + Celery + Redis
**New Stack:** Next.js 15 + Vercel Postgres (Neon) + Vercel Blob

**Rationale:**
1. **Simplicity**: Single codebase, one language (TypeScript)
2. **Deployment**: One-click Vercel deployment vs managing multiple services
3. **No Python-specific needs**: PDF processing and AI calls work fine in Node.js
4. **Serverless**: Vercel's edge functions scale automatically
5. **Cost**: Vercel's free tier is generous for MVP

**What we lose:**
- Django Admin (can build custom admin later)
- Celery background tasks (Vercel Functions handle async work)
- Python ML ecosystem (not needed for Gemini API calls)

**What we gain:**
- Type safety across full stack
- Faster development (no context switching)
- Better DX with Server Actions
- Built-in optimizations (image, font, etc.)

---

## Database Schema Notes

### Core Models (Production MVP)

**Primary Models:**
1. `User` - Teachers and students (role-based)
2. `Class` - Teacher-owned classrooms
3. `ClassMembership` - Student enrollments in classes
4. `InviteCode` - Class invite system with expiration
5. `PDF` - Uploaded PDF documents
6. `ProcessedContent` - Extracted text from PDFs
7. `Flashcard` - Generated flashcard sets
8. `Worksheet` - Generated worksheets
9. `ChatConversation` - Student chat sessions **with class/material context**
10. `ChatMessage` - Individual messages in conversations
11. `ClassMaterial` - Links materials to classes (many-to-many)

### Key Design Decisions

1. **User Role Enum**: `TEACHER`, `STUDENT`, `ADMIN`
   - Single `User` table, role-based access control
   - Enables future features like users with both roles
   - Admin role reserved for platform management

2. **Class-based Multi-tenancy**
   - Teachers create classes (one-to-many)
   - Students join via invite codes (many-to-many via ClassMembership)
   - Materials are shared at the class level (not individual students)
   - **Key insight:** All student activity (chats, views) is linked to their class context

3. **Invite Code System**
   - 6 alphanumeric characters (e.g., "ABC123")
   - Optional expiration date
   - Can be revoked by teacher
   - Uniqueness enforced at DB level
   - Used for: `/join/ABC123` URL pattern

4. **Chat Conversation Context** ⭐ **CRITICAL FEATURE**
   - Every `ChatConversation` has:
     - `userId` (the student)
     - `classId` (which class they were in when chatting)
     - `materialId` (optional - which PDF/flashcard they were viewing)
   - This allows teachers to:
     - View ALL chats from their classes
     - Filter by class, student, or material
     - Identify which topics confuse students most
     - See questions asked while viewing specific materials

5. **Material-Class Linking** (`ClassMaterial`)
   - Many-to-many relationship
   - A flashcard set can be shared with multiple classes
   - A class can have access to multiple materials
   - Tracks when material was shared with class
   - Allows teachers to bulk-share or unshare

6. **Separate `PDF` and `ProcessedContent` tables**
   - Why: PDFs can be uploaded but processing can fail
   - Allows retry logic without re-uploading
   - Keeps blob URLs separate from text content
   - ProcessedContent links to PDF via foreign key

7. **Flashcard/Worksheet JSON structure**
   - Stored as `Json` type in Prisma
   - Flexible schema (can change format without migrations)
   - Example flashcard structure:
   ```typescript
   {
     cards: [
       {
         front: string,
         back: string,
         hint?: string
       }
     ]
   }
   ```

### Schema Indexes (Performance)

**Critical indexes to add:**
```prisma
// Class lookups
@@index([teacherId])

// Membership queries
@@index([classId, userId])
@@index([userId, classId])

// Chat queries (VERY IMPORTANT for teacher insights)
@@index([classId, createdAt])  // Get all chats in a class, sorted by time
@@index([userId, classId])      // Get all chats by a student in a class
@@index([materialId, classId])  // Get all chats about a specific material

// Material sharing
@@index([classId])
@@index([materialType, materialId])

// Invite codes
@@index([code])  // Fast lookup for join flow
@@index([classId, isActive])  // Get active codes for a class
```

---

## Teacher Chat Insights Feature ⭐

### Overview
One of the platform's key differentiators is giving teachers visibility into student questions and struggles through chat history analysis.

### Implementation Strategy

**Database Structure:**
```typescript
// When a student starts a chat
ChatConversation {
  id: string
  userId: string          // The student
  classId: string         // Which class they're enrolled in
  materialId?: string     // Optional: PDF/flashcard they were viewing
  title: string           // Auto-generated or user-provided
  createdAt: DateTime
  messages: ChatMessage[]
}

ChatMessage {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  createdAt: DateTime
}
```

**Teacher Queries:**
```typescript
// Get all chats from a class
const chats = await db.chatConversation.findMany({
  where: { classId: classId },
  include: {
    user: { select: { name: true, email: true } },
    messages: { orderBy: { createdAt: 'asc' } },
    material: true  // Optional: PDF/flashcard info
  },
  orderBy: { createdAt: 'desc' }
});

// Get chats about a specific material
const materialChats = await db.chatConversation.findMany({
  where: {
    classId: classId,
    materialId: materialId
  }
});

// Get all chats from a specific student
const studentChats = await db.chatConversation.findMany({
  where: {
    userId: studentId,
    classId: classId
  }
});
```

**UI Components:**
1. **Class Insights Page** (`/teacher/classes/[classId]/insights`)
   - Overview stats: total chats, active students, common topics
   - List of all conversations with filters
   - Search by student name, date, or material

2. **Chat Viewer Component**
   - Shows full conversation thread
   - Student info (name, email)
   - Material context (if applicable)
   - Timestamp for each message

3. **Analytics Dashboard** (Future enhancement)
   - Most asked questions
   - Topics students struggle with
   - Peak chat times
   - Students who need extra help

**Privacy Considerations:**
- Students know chats are visible to teachers (mention in TOS/privacy policy)
- Teachers only see chats from THEIR classes
- No cross-class data leakage
- Consider adding a "private mode" toggle for sensitive questions (post-MVP)

---

## File Structure Patterns

```
app/
├── (auth)/                          # Public auth pages
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (teacher)/                       # Teacher-only pages (protected)
│   ├── layout.tsx                   # Shared teacher layout
│   ├── dashboard/page.tsx           # Teacher home
│   ├── classes/
│   │   ├── page.tsx                 # List all classes
│   │   └── [classId]/
│   │       ├── page.tsx             # Class details & roster
│   │       ├── insights/page.tsx    # Student chat history viewer ⭐
│   │       └── settings/page.tsx    # Class settings
│   └── library/                     # Materials library
│       ├── page.tsx                 # All materials with share options
│       └── [materialId]/page.tsx    # Material detail
├── (student)/                       # Student-only pages (protected)
│   ├── layout.tsx                   # Shared student layout
│   ├── dashboard/page.tsx           # Student home
│   ├── classes/
│   │   └── [classId]/page.tsx       # Class materials view
│   └── history/page.tsx             # Student's own chat history
├── join/[inviteCode]/page.tsx       # Public class join page
├── actions/                         # Server Actions (shared)
│   ├── auth.ts                      # Auth actions
│   ├── class.ts                     # Class management
│   ├── materials.ts                 # Material sharing
│   ├── chat.ts                      # Chat conversations
│   └── chatHistory.ts               # Existing (needs update)
└── api/                             # API routes (when Server Actions won't work)
    └── auth/[...nextauth]/route.ts  # NextAuth handler

lib/
├── auth.ts                          # NextAuth config
├── db.ts                            # Prisma client singleton
├── blob.ts                          # Vercel Blob helpers
├── processors/                      # Business logic
│   ├── pdf-processor.ts
│   └── ai-generator.ts
└── utils/                           # Utility functions
    ├── invite-code.ts               # Generate invite codes (updated from share-code)
    ├── qr-code.ts
    └── validation.ts

components/
├── shared/                          # Shared UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   └── Modal.tsx
├── teacher/
│   ├── ClassCard.tsx
│   ├── MaterialCard.tsx
│   ├── ChatHistoryViewer.tsx       # ⭐ Key component for insights
│   └── InviteCodeDisplay.tsx
└── student/
    ├── MaterialViewer.tsx
    └── ChatInterface.tsx
```

**Route Groups:**
- `(auth)`, `(teacher)`, `(student)` = Groups don't affect URL
- Allows shared layouts without adding URL segments
- Example: `app/(teacher)/classes/page.tsx` → `/classes`
- Example: `app/(student)/classes/page.tsx` → `/classes` (same URL, different content!)

**Key Routes:**
- Teacher creates class → `/classes`
- Teacher views insights → `/classes/abc123/insights` ⭐
- Student joins → `/join/ABC123`
- Student views materials → `/classes/abc123`

---

## Server Actions vs API Routes

### Use Server Actions when:
- Form submissions
- Mutations triggered by user interactions
- Need automatic revalidation
- Want progressive enhancement

### Use API Routes when:
- Third-party webhooks
- Need custom response headers
- Polling/streaming responses
- Client-side fetch from external apps

**For WordWyrm:**
- PDF upload: Server Action ✅
- Quiz generation: Server Action ✅
- Game creation: Server Action ✅
- Student submit answers: Server Action ✅
- Get game results (polling): API Route ✅

---

## PDF Processing Pipeline

### Flow:
1. Teacher uploads PDF (client)
2. Server Action receives File object
3. Convert to Buffer
4. Upload to Vercel Blob
5. Save PDF record to DB (with blob URL)
6. Extract text using pdf-parse
7. Save ProcessedContent to DB
8. Return extracted text to client

### Key Files to Port from Django:

**From `backend-wordwyrm/django_backend/api/views.py`:**

```python
# Lines 12-45: PDF processing
@csrf_exempt
def process_pdf(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        pdf_base64 = data.get('pdfBase64')
        pdf_data = base64.b64decode(pdf_base64)

        text = ''
        with fitz.open(stream=pdf_data, filetype='pdf') as doc:
            for page in doc:
                text += page.get_text()

        return JsonResponse({'success': True, 'extractedText': text})
```

**Node.js equivalent:**

```typescript
import pdf from 'pdf-parse';

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text;
}
```

**Note:** `pdf-parse` is more limited than PyMuPDF (fitz). If you need advanced features (OCR, images, tables), consider:
- `pdf.js` (Mozilla's library)
- `pdfjs-dist` (npm package)
- External API (Adobe PDF Services, Google Document AI)

---

## AI Generation (Gemini)

### Porting from Python to Node.js

**Python (Django):**
```python
import google.generativeai as genai

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.0-flash-exp')
response = model.generate_content(prompt)
summary = response.text
```

**TypeScript (Next.js):**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
const result = await model.generateContent(prompt);
const summary = result.response.text();
```

### JSON Parsing from Gemini

**Current Django approach:**
- Prompts Gemini to return JSON
- Manually strips markdown code blocks (```json)
- Parses with `json.loads()`

**Recommended Node.js approach:**
- Use Gemini's JSON mode: `generationConfig: { responseMimeType: "application/json" }`
- Define JSON schema in prompt
- No need to strip markdown
- More reliable

Example:
```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: { responseMimeType: "application/json" }
});
```

---

## Authentication Flow

### NextAuth.js v5 (Auth.js)

**Key Changes from v4:**
- Better TypeScript support
- Edge runtime support
- Simplified configuration

**Setup:**
```typescript
// lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { db } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role;
      return session;
    }
  }
});
```

**Middleware for protection:**
```typescript
// middleware.ts
import { auth } from './lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const role = req.auth?.user?.role;

  if (path.startsWith('/teacher') && role !== 'TEACHER') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (path.startsWith('/student') && role !== 'STUDENT') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

---

## Vercel Blob Storage

### Setup:
```typescript
// lib/blob.ts
import { put, del } from '@vercel/blob';

export async function uploadPDF(file: File): Promise<string> {
  const blob = await put(`pdfs/${file.name}`, file, {
    access: 'public',
    addRandomSuffix: true
  });
  return blob.url;
}

export async function deletePDF(url: string): Promise<void> {
  await del(url);
}
```

### Best Practices:
- Add random suffix to prevent collisions
- Use `public` access for QR codes (shareable)
- Use `private` access for PDFs (teacher-only)
- Set content-type header for PDFs
- Consider file size limits (25MB for WordWyrm)

---

## Share Code Generation

### Requirements:
- 6 characters, alphanumeric
- Easy to type (avoid ambiguous chars: 0/O, 1/I/l)
- Unique in database
- Collision handling

**Implementation:**
```typescript
// lib/utils/share-code.ts
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0,O,I,1

export function generateShareCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function generateUniqueShareCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateShareCode();
    const existing = await db.game.findUnique({ where: { shareCode: code } });
    if (!existing) return code;
    attempts++;
  }
  throw new Error('Failed to generate unique share code');
}
```

---

## QR Code Generation

### Using `qrcode` package:
```typescript
// lib/utils/qr-code.ts
import QRCode from 'qrcode';
import { put } from '@vercel/blob';

export async function generateGameQRCode(shareCode: string): Promise<string> {
  const gameUrl = `${process.env.NEXTAUTH_URL}/play/${shareCode}`;

  // Generate QR code as buffer
  const qrBuffer = await QRCode.toBuffer(gameUrl, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M'
  });

  // Upload to Vercel Blob
  const blob = await put(`qr-codes/${shareCode}.png`, qrBuffer, {
    access: 'public',
    contentType: 'image/png'
  });

  return blob.url;
}
```

---

## Error Handling Patterns

### Server Actions:
```typescript
'use server'

export async function uploadPDF(formData: FormData) {
  try {
    const file = formData.get('file') as File;

    // Validation
    if (!file) {
      return { error: 'No file provided', success: false };
    }

    if (file.size > 25 * 1024 * 1024) {
      return { error: 'File too large (max 25MB)', success: false };
    }

    // Business logic
    const blobUrl = await uploadToBlob(file);
    const pdf = await db.pdf.create({
      data: { /* ... */ }
    });

    return { success: true, data: pdf };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      error: 'Failed to upload PDF',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

**Return type pattern:**
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: string };
```

---

## Database Best Practices

### Prisma Client Singleton:
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

**Why:** Prevents "Too many Prisma Clients" error in development (hot reload)

### Query Optimization:
- Use `select` to fetch only needed fields
- Use `include` for relations
- Add indexes on foreign keys and frequently queried fields
- Use `findUnique` when possible (faster than `findFirst`)

---

## Testing Strategy

### Manual Testing Checklist:
1. **Auth Flow:**
   - Sign up as teacher
   - Sign up as student
   - Log in/out
   - Role-based redirects

2. **Teacher Flow:**
   - Upload small PDF (< 1MB)
   - Upload large PDF (> 10MB)
   - Upload invalid file (should fail)
   - Generate quiz
   - Create game
   - View game QR code
   - Share link with student

3. **Student Flow:**
   - Visit game link
   - Join game (logged in)
   - Join game (guest mode, if implemented)
   - Play quiz
   - Submit answers
   - View results

4. **Edge Cases:**
   - Empty PDF
   - Scanned PDF (no text)
   - Password-protected PDF
   - Network timeout during processing
   - Gemini API rate limit
   - Duplicate share code collision

---

## Performance Considerations

### Current Bottlenecks:
1. **PDF Processing**: 5-10s for large PDFs
2. **Gemini API**: 3-5s per request
3. **Database queries**: < 100ms (should be fine)

### Optimization Strategies:
1. **Streaming responses**: Use Vercel's streaming for AI generation
2. **Background processing**: Use Vercel Functions (60s timeout on Pro)
3. **Caching**: Cache generated quizzes (same PDF = same quiz?)
4. **Parallel processing**: Process PDFs + generate QR codes in parallel
5. **CDN**: Vercel's CDN caches static assets automatically

### Vercel Limits (Free Tier):
- Function timeout: 10s (upgrade to 60s on Pro)
- Function memory: 1GB
- Bandwidth: 100GB/month
- Postgres: 256MB storage, 10k rows
- Blob: 0.5GB storage

**For 100 concurrent users:**
- Need Pro plan ($20/month)
- Consider edge functions for low-latency
- Monitor Gemini API costs (main variable cost)

---

## Deployment Checklist

### Before deploying:
- [ ] All environment variables set in Vercel
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Prisma Client generated
- [ ] Test with production-like data
- [ ] Check Vercel Function logs for errors
- [ ] Set up monitoring (Vercel Analytics, Sentry)

### Post-deployment:
- [ ] Test auth flow in production
- [ ] Upload test PDF
- [ ] Generate test quiz
- [ ] Create test game
- [ ] Join game as student
- [ ] Monitor error rates
- [ ] Check database query performance

---

## Future Improvements

### Short-term (1-2 months):
- [ ] Add flashcards generation
- [ ] Add summary generation
- [ ] Improve quiz UI (animations, sounds)
- [ ] Add teacher analytics dashboard
- [ ] Export results to CSV

### Medium-term (3-6 months):
- [ ] Real-time game updates (WebSockets via Vercel)
- [ ] Leaderboards
- [ ] Team mode (students collaborate)
- [ ] Custom quiz templates
- [ ] Support for DOCX, TXT files

### Long-term (6+ months):
- [ ] Mobile app (React Native + Expo)
- [ ] Offline mode
- [ ] AI-powered adaptive quizzing
- [ ] Integration with LMS (Canvas, Blackboard)
- [ ] White-label solution for schools

---

## Phase 2 Implementation Details

### Authentication Setup Process
1. Installed dependencies:
   ```bash
   npm install next-auth@beta bcryptjs zod @auth/prisma-adapter
   npm install -D @types/bcryptjs
   ```
2. Generated `NEXTAUTH_SECRET` and added to `.env`:
   ```bash
   openssl rand -base64 32
   ```
3. Created `lib/auth.ts` with NextAuth v5 configuration
4. Created auth server actions in `app/actions/auth.ts`
5. Created auth pages:
   - `app/(auth)/login/page.tsx` - Login form
   - `app/(auth)/signup/page.tsx` - Signup with role selection
6. Created API route handler: `app/api/auth/[...nextauth]/route.ts`
7. Created `middleware.ts` for route protection

### Key Implementation Decisions
- **NextAuth v5 (beta)**: Uses new `auth()` function pattern
- **JWT sessions**: Stateless, better for serverless environments
- **No PrismaAdapter**: Simplified approach, manual user management
- **Role in JWT**: Stored in token for fast access in middleware
- **Credentials provider**: Email/password (can add OAuth later)

### Route Protection Strategy
```typescript
// middleware.ts
- Public routes: /, /login, /signup
- Teacher routes: /classes, /library → redirect to /classes after login
- Student routes: /dashboard, /history → redirect to /dashboard after login
- Already logged in + visiting auth pages → redirect to dashboard
- Not logged in + visiting protected route → redirect to /login with callback
```

### Auth Server Actions
```typescript
signup(formData) {
  1. Validate with Zod
  2. Check if user exists
  3. Hash password (bcrypt, rounds=12)
  4. Create user with role
  5. Return userId
}

login(formData) {
  1. Validate with Zod
  2. Call NextAuth signIn()
  3. Handle AuthError
  4. Return success/error
}
```

### Updated Actions for Auth
- `chatHistory.ts` - Now requires classId, userId from session
- `pdf.ts` - Requires authentication, gets userId from session
- `flashcard.ts` - Gets userId from PDF owner
- `worksheet.ts` - Gets userId from PDF owner

### Gotchas Encountered
- **NextAuth v5 types**: Had to manually extend session/user types
- **Zod enum error messages**: Use `{ message: '...' }` not `{ errorMap: ... }`
- **Zod error access**: Use `.issues[0]` not `.errors[0]`
- **ChatConversation schema change**: Messages are now relations, not JSON string
- **Material userId required**: All materials need userId for authorization

---

## Phase 1 Implementation Details

### Database Setup Process
1. Created Vercel Postgres (Neon) via Vercel dashboard
2. Created Vercel Blob storage via Vercel dashboard
3. Ran `vercel link` and `vercel env pull` to get environment variables
4. Updated `prisma/schema.prisma`:
   - Changed provider from `sqlite` to `postgresql`
   - Set `url = env("DATABASE_URL")`
   - Set `directUrl = env("DATABASE_URL_UNPOOLED")`
5. Created `.env` file (Prisma reads this, not `.env.local`)
6. Ran `npx prisma generate` to create Prisma Client
7. Ran `npx prisma db push` to sync schema to database

### Gotchas Encountered
- **Prisma reads `.env` not `.env.local`**: Had to copy `.env.local` to `.env`
- **Environment variable naming**: Vercel creates `DATABASE_URL_UNPOOLED`, not `POSTGRES_URL_NON_POOLING`
- **Opposite relations required**: ChatConversation → PDF relation needed `chatConversations` field on PDF model

### Database Models Summary
**11 Models Created:**
1. User (with email, passwordHash, role)
2. Class (teacher-owned)
3. ClassMembership (student enrollments)
4. InviteCode (6-char codes with expiration)
5. PDF (Vercel Blob URLs)
6. ProcessedContent (extracted text)
7. Material (flashcards, worksheets, etc.)
8. ClassMaterial (many-to-many sharing)
9. ChatConversation (with classId + materialId context) ⭐
10. ChatMessage (structured messages)

**Key Indexes:**
- Chat queries: `[classId, createdAt]`, `[classId, userId]`, `[materialId, classId]`
- User lookups: `[email]`, `[role]`
- Class queries: `[teacherId]`, `[isActive]`
- Memberships: `[classId, userId]` unique
- Invite codes: `[code]` unique

---

## Common Pitfalls

### 1. Prisma Client in Server Actions
**Problem:** Importing Prisma in Server Actions can cause hydration errors.
**Solution:** Always use `'use server'` directive and import from `lib/db.ts`.

### 2. File uploads in Server Actions
**Problem:** Server Actions have size limits (4.5MB default).
**Solution:** Use Route Handlers for large files, or increase limit in next.config.ts:
```typescript
export default {
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb'
    }
  }
};
```

### 3. Environment variables in Client Components
**Problem:** `process.env` not available in client.
**Solution:** Prefix with `NEXT_PUBLIC_` or use Server Actions.

### 4. Prisma migrations on Vercel
**Problem:** Migrations not applied on deploy.
**Solution:** Add build command: `prisma migrate deploy && next build`

### 5. Gemini API timeouts
**Problem:** Long prompts timeout Vercel Functions.
**Solution:** Use streaming or background jobs for long requests.

---

## Useful Commands

```bash
# Database
npx prisma migrate dev --name init   # Create migration
npx prisma generate                  # Generate Prisma Client
npx prisma studio                    # Open DB GUI
npx prisma db push                   # Push schema without migration

# Development
npm run dev                          # Start dev server
npm run build                        # Build for production
npm run start                        # Start production server

# Vercel
vercel                               # Deploy to preview
vercel --prod                        # Deploy to production
vercel env pull .env.local           # Pull env vars
vercel logs                          # View logs
```

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://authjs.dev)
- [Vercel Docs](https://vercel.com/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse)
- [qrcode](https://www.npmjs.com/package/qrcode)

---

**Last Updated:** October 29, 2025
**Version:** 2.2 - Phase 1-2 Complete
**Status:** ✅ Database Ready | ✅ Auth Ready | Starting Phase 3 (Class Management)

## Changelog

**v2.2 (October 29, 2025)** - Phase 2 Complete (Authentication)
- ✅ **NextAuth.js v5 Implementation**
  - Configured NextAuth with Credentials provider
  - Implemented bcrypt password hashing
  - Created JWT-based sessions with role claims
  - Extended types for user roles (TEACHER, STUDENT, ADMIN)
- ✅ **Authentication Pages**
  - Login page with email/password
  - Signup page with role selection (Teacher/Student)
  - DaisyUI styled forms with error handling
  - Form validation using Zod
- ✅ **Route Protection Middleware**
  - Role-based access control
  - Teacher routes: `/classes`, `/library`
  - Student routes: `/dashboard`, `/history`
  - Public routes: `/`, `/login`, `/signup`
  - Auto-redirect based on role after login
- ✅ **Auth Server Actions**
  - signup() - create new user with role
  - login() - authenticate and create session
  - getCurrentUser() - get session user
- ✅ **Database Integration Updates**
  - Updated chatHistory.ts for new ChatConversation schema
  - Added getClassChatHistory() for teacher insights
  - Fixed Material/PDF actions to require userId
  - All protected actions now check authentication

**v2.1 (October 29, 2025)** - Phase 1 Complete
- ✅ **Database Schema Implemented**
  - Migrated from SQLite to PostgreSQL (Vercel Neon)
  - Created 11 production models (User, Class, ClassMembership, InviteCode, etc.)
  - Added ChatConversation with classId/materialId context for teacher insights
  - Implemented all strategic indexes for performance
- ✅ **Vercel Infrastructure Setup**
  - Connected to Vercel Postgres (Neon)
  - Connected to Vercel Blob storage
  - Environment variables configured
  - Database schema pushed and verified
- 📝 **Implementation Notes Added**
  - Prisma uses `.env` file (not `.env.local`)
  - Schema uses `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
  - All relations and cascade deletes configured
  - lib/db.ts singleton already in place

**v2.0 (January 2025)**
- Shifted to production MVP with class management system
- Added invite code system for student enrollment
- Implemented material-class sharing architecture
- **Added teacher chat insights feature** (view student questions/struggles)
- Updated file structure for class-based multi-tenancy
- Added comprehensive database schema with indexes
- Updated architecture for Vercel Postgres (Neon) + Blob storage

**v1.0 (October 2025)**
- Initial migration notes from Django stack
- Basic PDF processing and AI generation patterns
