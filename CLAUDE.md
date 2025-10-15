# Claude Implementation Notes

This file contains technical notes, patterns, and gotchas for Claude (or any developer) working on WordWyrm.

---

## Architecture Decisions

### Why Next.js Only (No Django)?

**Original Stack:** Django + Next.js + Supabase + Celery + Redis
**New Stack:** Next.js + Vercel Postgres + Vercel Blob

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

### Key Design Decisions

1. **User Role Enum**: `TEACHER`, `STUDENT`, `ADMIN`
   - Single `User` table, separate profile tables
   - Enables future features like users with both roles
   - Admin role reserved for platform management

2. **Separate `PDF` and `ProcessedContent` tables**
   - Why: PDFs can be uploaded but processing can fail
   - Allows retry logic without re-uploading
   - Keeps blob URLs separate from text content

3. **Quiz JSON structure**
   - Stored as `Json` type in Prisma
   - Flexible schema (can change quiz format without migrations)
   - Example structure:
   ```typescript
   {
     questions: [
       {
         question: string,
         options: string[],
         answer: string,
         explanation?: string
       }
     ]
   }
   ```

4. **GameSession constraints**
   - `@@unique([gameId, studentId])`: One session per student per game
   - To allow multiple attempts, we'd need to change this to:
     - Remove unique constraint
     - Add `attemptNumber` field
     - Add composite index on `[gameId, studentId, attemptNumber]`

5. **Share codes**
   - 6 alphanumeric characters (e.g., "ABC123")
   - Uniqueness enforced at DB level
   - Collision probability low but handle in code anyway

---

## File Structure Patterns

```
app/
├── (auth)/          # Public auth pages
├── (teacher)/       # Teacher-only pages (protected)
├── (student)/       # Student-only pages (protected)
├── play/            # Public game pages (no auth required)
├── actions/         # Server Actions (shared)
└── api/             # API routes (when Server Actions won't work)

lib/
├── auth.ts          # NextAuth config
├── db.ts            # Prisma client singleton
├── blob.ts          # Vercel Blob helpers
├── processors/      # Business logic
│   ├── pdf-processor.ts
│   └── ai-generator.ts
└── utils/           # Utility functions
    ├── qr-code.ts
    ├── share-code.ts
    └── validation.ts
```

**Route Groups:**
- `(auth)`, `(teacher)`, `(student)` = Groups don't affect URL
- Allows shared layouts without adding URL segments
- Example: `app/(teacher)/dashboard/page.tsx` → `/dashboard`

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

**Last Updated:** October 15, 2025
**Version:** 1.0
