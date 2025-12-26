# Modern Greek Education Platform

A production-ready educational platform demonstrating advanced AI-powered tools for Modern Greek language learning. This application showcases enterprise-grade RAG (Retrieval-Augmented Generation) with hierarchical chunking, hybrid search, and intelligent reranking.

## Overview

This platform is built for teachers and students, featuring:
- **Teacher Dashboard**: Upload materials, manage classes, track student engagement
- **Student Interface**: AI-powered chat with course materials, conversation history
- **Advanced RAG System**: State-of-the-art document processing and semantic search

## Core Features

### 1. Intelligent Document Processing
- Upload PDFs, DOCX, or TXT files
- Automatic text extraction with page-level metadata
- Image description extraction using GPT-4o vision
- Smart hierarchical chunking for optimal context retrieval

### 2. Advanced RAG Chatbot
- **Hybrid Search**: Combines vector similarity (semantic) + BM25 (keyword matching)
- **Hierarchical Retrieval**: Small chunks for search, large chunks for context
- **Cross-Encoder Reranking**: GPT-4o-mini re-scores results for precision
- **Conversation Memory**: Maintains context across multiple exchanges
- **Strict Citation**: Every answer cites source materials with page numbers

### 3. Class Management
- Create and manage multiple classes
- Invite students with QR codes or alphanumeric codes
- Track file processing status
- Monitor student chat history and engagement

## Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 15 (App Router) | Server-side rendering, API routes |
| **Language** | TypeScript | Type safety and developer experience |
| **Database** | PostgreSQL + pgvector | Relational data + vector similarity search |
| **ORM** | Prisma | Type-safe database access |
| **File Storage** | Vercel Blob | Scalable cloud file storage |
| **AI Models** | OpenAI API | Embeddings, chat, vision, reranking |
| **Styling** | Tailwind CSS + DaisyUI | Modern, responsive UI |
| **Auth** | NextAuth.js 5 | Secure authentication system |

### RAG Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FILE UPLOAD                              │
│  Teacher uploads PDF/DOCX/TXT → Vercel Blob Storage             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TEXT EXTRACTION                              │
│  • PDF: Page-by-page with metadata (page numbers, sections)     │
│  • Images: GPT-4o vision extracts descriptions                  │
│  • DOCX/TXT: Full text extraction                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                HIERARCHICAL CHUNKING                            │
│                                                                 │
│  PARENT CHUNKS (2000-4000 tokens)                              │
│  • Large context chunks for LLM understanding                  │
│  • Preserve document structure and flow                        │
│  • NOT embedded (no vector search on these)                    │
│                                                                 │
│  CHILD CHUNKS (256-512 tokens)                                 │
│  • Small, searchable chunks                                    │
│  • Embedded with OpenAI text-embedding-3-small (1536D)         │
│  • 50-token overlap for context continuity                     │
│  • Each child links to its parent                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  VECTOR EMBEDDING                               │
│  • OpenAI text-embedding-3-small (1536 dimensions)              │
│  • Batch processing (100 chunks at a time)                      │
│  • Stored in PostgreSQL with pgvector extension                │
│  • Creates full-text search index (tsvector) for BM25          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE                                      │
│  PostgreSQL Database:                                           │
│  • Parent chunks (content only, no embeddings)                  │
│  • Child chunks (content + 1536D vector embeddings)             │
│  • Metadata (page numbers, sections, image descriptions)        │
│  • Parent-child relationships preserved                         │
└─────────────────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════

When a student asks a question:

┌─────────────────────────────────────────────────────────────────┐
│                     QUERY PROCESSING                            │
│  Student question → Embed query with same model                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              HYBRID SEARCH (Parallel)                           │
│                                                                 │
│  Vector Search (Semantic):                                      │
│  • Cosine similarity on child chunk embeddings                  │
│  • Finds semantically similar content                          │
│  • Weight: 0.7 (default)                                        │
│                                                                 │
│  BM25 Search (Keyword):                                         │
│  • PostgreSQL full-text search (tsvector)                       │
│  • Exact keyword matching                                       │
│  • Weight: 0.3 (default)                                        │
│                                                                 │
│  Results: Top 30 child chunks (configurable)                    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SCORE FUSION                                    │
│  • Normalize vector scores (0-1)                                │
│  • Normalize BM25 scores (0-1)                                  │
│  • Combined score = (vector × 0.7) + (BM25 × 0.3)              │
│  • Merge and deduplicate results                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              CROSS-ENCODER RERANKING                            │
│  • GPT-4o-mini scores each chunk (0-10)                        │
│  • Evaluates query-document relevance                          │
│  • Returns top 5 chunks (configurable)                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              PARENT RETRIEVAL                                   │
│  • For each top child chunk, fetch its PARENT chunk             │
│  • Provides full context (2000-4000 tokens) to LLM              │
│  • Includes image descriptions if present                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 LLM GENERATION                                  │
│  • GPT-4o-mini with parent chunks as context                    │
│  • Conversation history for continuity                          │
│  • Strict citation requirements [FileName, p.XX]                │
│  • Hallucination prevention (context-only answers)              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 RESPONSE                                        │
│  • Detailed answer with citations                               │
│  • Source metadata (file names, page numbers)                   │
│  • Saved to conversation history                                │
└─────────────────────────────────────────────────────────────────┘
```

## Installation & Setup

### Prerequisites

1. **Node.js 18+** and **npm**

   **macOS** (using Homebrew):
   ```bash
   # Install Homebrew if you don't have it
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

   # Install Node.js (includes npm)
   brew install node

   # Verify installation
   node --version  # Should show v18.x.x or higher
   npm --version   # Should show 9.x.x or higher
   ```

   **Windows**:
   ```
   Download from: https://nodejs.org/en/download/
   • Choose "LTS" version (Long Term Support)
   • Run the installer
   • Restart your terminal/command prompt
   • Verify: node --version && npm --version
   ```

   **Linux** (Ubuntu/Debian):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version && npm --version
   ```

2. **PostgreSQL 14+** with **pgvector** extension

   **Option A: Vercel Postgres** (Recommended - easiest):
   ```bash
   # Sign up at vercel.com
   # Create a new Postgres database in your Vercel dashboard
   # Copy the DATABASE_URL and DATABASE_URL_UNPOOLED connection strings
   ```

   **Option B: Local PostgreSQL + pgvector**:

   macOS:
   ```bash
   brew install postgresql@14
   brew services start postgresql@14

   # Install pgvector
   cd /tmp
   git clone --branch v0.5.0 https://github.com/pgvector/pgvector.git
   cd pgvector
   make
   make install  # May need sudo
   ```

   Ubuntu/Debian:
   ```bash
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql

   # Install pgvector
   sudo apt install postgresql-server-dev-14 git build-essential
   cd /tmp
   git clone --branch v0.5.0 https://github.com/pgvector/pgvector.git
   cd pgvector
   make
   sudo make install
   ```

   Windows:
   ```
   Download PostgreSQL: https://www.postgresql.org/download/windows/
   For pgvector: Use WSL2 or Docker (see Docker option below)
   ```

   **Option C: Docker** (works on all platforms):
   ```bash
   # Create docker-compose.yml in project root
   docker-compose up -d

   # Connection string will be:
   # DATABASE_URL="postgresql://postgres:password@localhost:5432/greekdemo"
   ```

   Sample `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: ankane/pgvector:latest
       environment:
         POSTGRES_PASSWORD: password
         POSTGRES_DB: greekdemo
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   volumes:
     postgres_data:
   ```

3. **OpenAI API Key**

   Get your API key from: https://platform.openai.com/api-keys
   - Create an account or log in
   - Navigate to API keys
   - Click "Create new secret key"
   - Copy and save it securely (you won't see it again)

### Step 1: Clone & Install Dependencies

```bash
cd greek-demo
npm install
```

This installs all required packages including:
- Next.js framework
- Prisma ORM
- OpenAI SDK
- PDF processing libraries
- Authentication libraries
- UI components

### Step 2: Environment Configuration

Create a `.env.local` file in the root directory:

```env
# ============================================================================
# DATABASE (PostgreSQL with pgvector)
# ============================================================================

# Vercel Postgres (recommended)
DATABASE_URL="postgres://username:password@hostname/database?sslmode=require"
DATABASE_URL_UNPOOLED="postgres://username:password@hostname/database?sslmode=require"

# OR Local PostgreSQL
# DATABASE_URL="postgresql://postgres:password@localhost:5432/greekdemo"
# DATABASE_URL_UNPOOLED="postgresql://postgres:password@localhost:5432/greekdemo"

# OR Docker
# DATABASE_URL="postgresql://postgres:password@localhost:5432/greekdemo"
# DATABASE_URL_UNPOOLED="postgresql://postgres:password@localhost:5432/greekdemo"

# ============================================================================
# OPENAI API
# ============================================================================

# Get your key from: https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============================================================================
# VERCEL BLOB (File Storage)
# ============================================================================

# Get from: https://vercel.com/dashboard/stores
# Create a Blob store in your Vercel project
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx"

# ============================================================================
# NEXTAUTH (Authentication)
# ============================================================================

# Generate a random secret:
# Run: openssl rand -base64 32
NEXTAUTH_SECRET="your-randomly-generated-secret-here"

# Your app URL (update for production)
NEXTAUTH_URL="http://localhost:3000"
```

**Important Notes:**
- Never commit `.env.local` to Git (it's in `.gitignore`)
- For production, use Vercel environment variables dashboard
- `DATABASE_URL_UNPOOLED` is used for long-running operations (file processing)

### Step 3: Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Create database schema and enable pgvector
npx prisma db push

# Verify database (optional - opens GUI)
npx prisma studio
```

**What this does:**
1. **Prisma Generate**: Creates TypeScript types from your schema
2. **DB Push**:
   - Creates all tables (User, Class, ClassFile, FileChunk, etc.)
   - Enables pgvector extension
   - Creates vector indexes for fast similarity search
   - Creates full-text search indexes for BM25
3. **Prisma Studio**: Visual database browser (optional)

**Troubleshooting Database Setup:**

If you see "extension 'vector' not found":
```bash
# Connect to your database
psql -U postgres -d greekdemo

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx vector

# Exit
\q
```

### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 5: Create Your First User

The app has role-based access:
- **TEACHER**: Can create classes, upload files, view all student chats
- **STUDENT**: Can join classes, chat with materials

**To create your first teacher account:**
1. Visit http://localhost:3000
2. Click "Create Account"
3. Fill in details and select "Teacher" role
4. Sign in with your credentials

**To create student accounts:**
1. Teachers create invite codes in their class dashboard
2. Students use the invite code to join
3. OR create directly via sign-up page (select "Student" role)

## How It Works

### Chunking System Explained

The system uses **hierarchical chunking** - a two-tier approach that solves the "lost in context" problem:

#### Why Hierarchical Chunking?

**Problem with traditional chunking:**
- Small chunks (good for search) lose surrounding context
- Large chunks (good for context) are too broad for precise search

**Our solution: Parent-Child hierarchy**

```
┌─────────────────────────────────────────────────────────┐
│              PARENT CHUNK (2000-4000 tokens)            │
│                                                         │
│  Full chapter or section with complete context         │
│  Used for: LLM understanding and generation             │
│  Embedded: NO (not searched)                            │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │   CHILD CHUNK 1 (256-512 tokens)              │     │
│  │   First paragraph with 50-token overlap       │     │
│  │   Embedded: YES (searched)                    │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │   CHILD CHUNK 2 (256-512 tokens)              │     │
│  │   Second paragraph with 50-token overlap      │     │
│  │   Embedded: YES (searched)                    │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ... more child chunks ...                             │
└─────────────────────────────────────────────────────────┘
```

**Process:**
1. Extract text from uploaded file (with page metadata for PDFs)
2. Split into PARENT chunks (2000-4000 tokens) using sentence boundaries
3. For each parent, create CHILD chunks (256-512 tokens) with 50-token overlap
4. Embed ONLY child chunks (saves storage, faster search)
5. Store parent-child relationships in database

**At search time:**
1. Search CHILD chunks (precise, fast)
2. Return PARENT chunks to LLM (full context)
3. Best of both worlds: precision + context

**Implementation details:**
- Token estimation: ~4 characters = 1 token
- Sentence boundary detection using `compromise` NLP library
- Overlap prevents context breaks mid-concept
- Page numbers mapped to chunks for citation

### Search & RAG System Explained

The system uses **RAG 2.0** - a multi-stage retrieval pipeline combining multiple techniques:

#### Stage 1: Hybrid Search

**Why hybrid? Each method has strengths:**

| Method | Strength | Weakness | Example |
|--------|----------|----------|---------|
| **Vector Search** | Understands meaning & synonyms | Misses exact terms | "automobile" finds "car" |
| **BM25 (Keyword)** | Exact term matching | Misses synonyms | "car" won't find "automobile" |

**Our approach: Combine both**

```python
# Simplified algorithm
vector_score = cosine_similarity(query_embedding, chunk_embedding)  # 0-1
bm25_score = full_text_search(query, chunk_content)  # 0-1

# Weighted combination
combined_score = (vector_score × 0.7) + (bm25_score × 0.3)
```

**Result:** Top 30 chunks with best combined relevance

#### Stage 2: Cross-Encoder Reranking

**Why rerank?**
- Initial search (bi-encoder) is fast but imprecise
- Cross-encoder evaluates query + chunk together (more accurate)
- Trade-off: slower, so only on top candidates

**Process:**
1. Send top 30 chunks to GPT-4o-mini
2. Score each chunk 0-10 for relevance to query
3. Re-sort by score
4. Keep top 5

**Example prompt to reranker:**
```
Query: "What is photosynthesis?"
Chunk 1: "Photosynthesis is the process plants use to convert light..."
Chunk 2: "Plants require water, sunlight, and carbon dioxide..."

Score each chunk's relevance to the query (0-10).
```

#### Stage 3: Parent Retrieval

**Context expansion:**
1. We now have 5 highly relevant CHILD chunks
2. For each child, fetch its PARENT chunk
3. Parent chunks contain 2000-4000 tokens of context
4. This gives the LLM full chapter context, not just snippets

**Example:**
```
Child found: "Chlorophyll absorbs light energy..."
Parent returned: "Chapter 3: Photosynthesis in Plants
                  Introduction to how plants produce energy...
                  [2500 tokens of full context]
                  ...Chlorophyll absorbs light energy..."
```

#### Stage 4: LLM Generation

**Input to GPT-4o-mini:**
- User query
- 5 parent chunks (full context)
- Conversation history (last 10 messages)
- Source metadata (file names, page numbers)

**System prompt enforces:**
- Answer ONLY from provided context (no hallucination)
- Cite every claim with [FileName, p.XX]
- Admit when information is not available
- Pedagogical, supportive tone

**Output:**
```
According to the materials, photosynthesis is the process by which
plants convert light energy into chemical energy [Biology_Ch3.pdf, p.42].

The process requires three key ingredients:
1. Water (H₂O) absorbed through roots [Biology_Ch3.pdf, p.43]
2. Carbon dioxide (CO₂) from the air [Biology_Ch3.pdf, p.43]
3. Sunlight captured by chlorophyll [Biology_Ch3.pdf, p.44]

Would you like me to explain any specific step in more detail?
```

### Configuration & Tuning

All RAG parameters are configurable in `lib/config.ts`:

```typescript
export const RAG_CONFIG = {
  initialK: 30,        // Initial candidates from hybrid search
  finalK: 5,           // Final results after reranking
  vectorWeight: 0.7,   // Weight for semantic search (0-1)
  bm25Weight: 0.3,     // Weight for keyword search (0-1)
  useReranking: true,  // Enable/disable reranking
  conversationHistoryLimit: 10,  // Messages to include for context
};
```

**Tuning guidelines:**

| Parameter | Higher Value | Lower Value | Use Case |
|-----------|--------------|-------------|----------|
| `initialK` | Better recall, slower | Faster, may miss results | More for broad topics |
| `finalK` | More context, more cost | Focused, cheaper | More for detailed questions |
| `vectorWeight` | Favor semantic matching | Favor exact terms | Conceptual vs technical |
| `bm25Weight` | Favor exact keywords | Favor meaning | Technical vs conceptual |
| `useReranking` | Better precision, slower | Faster, less accurate | Quality vs speed |

## Project Structure

```
greek-demo/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages (login, register)
│   ├── (teacher)/                # Teacher-only pages
│   │   ├── classes/              # Class management
│   │   ├── upload/               # File upload interface
│   │   └── games/                # Game creation tools
│   ├── (student)/                # Student-only pages
│   │   ├── chat/                 # RAG chatbot interface
│   │   └── history/              # Conversation history
│   ├── api/                      # API routes
│   │   └── auth/[...nextauth]/   # NextAuth.js endpoints
│   ├── actions/                  # Server Actions
│   │   ├── auth.ts               # Authentication logic
│   │   ├── class.ts              # Class management
│   │   ├── fileUpload.ts         # File processing pipeline
│   │   ├── chat.ts               # RAG chat logic
│   │   └── chatHistory.ts        # Conversation management
│   ├── hooks/                    # React hooks
│   └── layout.tsx                # Root layout
│
├── lib/                          # Core business logic
│   ├── chunking/                 # Text chunking algorithms
│   │   ├── hierarchical-chunker.ts   # Parent-child chunking
│   │   └── text-chunker.ts           # Simple chunking (legacy)
│   ├── extractors/               # File content extraction
│   │   ├── pdf-extractor.ts      # PDF processing with pages
│   │   ├── text-extractor.ts     # DOCX/TXT extraction
│   │   └── poppler-wrapper.ts    # PDF image extraction
│   ├── utils/                    # Utility functions
│   │   ├── invite-code.ts        # Invite code generation
│   │   └── qr-code.ts            # QR code generation
│   ├── auth.ts                   # NextAuth configuration
│   ├── db.ts                     # Prisma client singleton
│   ├── openai.ts                 # OpenAI API wrapper
│   ├── vectorSearch.ts           # Hybrid search + reranking
│   ├── blob.ts                   # Vercel Blob helpers
│   └── config.ts                 # RAG configuration
│
├── prisma/                       # Database
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Database migrations (if using migrate)
│
├── components/                   # React components (if any)
│
├── public/                       # Static assets
│
├── .env.local                    # Environment variables (not in Git)
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind CSS config
└── next.config.js                # Next.js config
```

## Database Schema

### Key Models

```prisma
model User {
  role      UserRole  // TEACHER | STUDENT | ADMIN
  email     String    @unique
  name      String
  passwordHash String
}

model Class {
  teacher      User
  name         String
  students     ClassMembership[]
  files        ClassFile[]
  inviteCodes  InviteCode[]
}

model ClassFile {
  fileName     String
  fileType     String
  blobUrl      String
  status       FileProcessingStatus  // PENDING | PROCESSING | COMPLETED | FAILED
  chunks       FileChunk[]
}

model FileChunk {
  content      String
  embedding    Vector(1536)?        // pgvector type
  chunkType    ChunkType            // PARENT | CHILD
  parentId     String?              // Link to parent chunk
  pageNumber   Int?                 // PDF page number
  section      String?              // Detected section heading
  imageDesc    String?              // GPT-4o image description
  hasImages    Boolean
}

model ChatConversation {
  user         User
  class        Class
  messages     ChatMessage[]
}

model ChatMessage {
  role         String    // "user" | "assistant"
  content      String
  conversation ChatConversation
}
```

Full schema: `prisma/schema.prisma`

## Development Workflow

### Making Changes

1. **Modify code**
2. **Test locally** with `npm run dev`
3. **Commit changes**
4. **Deploy** to Vercel (auto-deploys from main branch)

### Database Changes

```bash
# Edit prisma/schema.prisma
# Then push changes:
npx prisma db push

# Regenerate Prisma Client:
npx prisma generate

# Restart dev server
npm run dev
```

### Adding New Features

1. Design database models (if needed)
2. Create Server Actions in `app/actions/`
3. Build UI components
4. Add routes in `app/`
5. Test end-to-end

### Debugging RAG System

**Enable verbose logging:**
```typescript
// In lib/vectorSearch.ts
console.log('[Hybrid Search] Query:', query);
console.log('[RAG Search] Results:', results);
```

**Test search directly:**
```bash
# Open Prisma Studio
npx prisma studio

# Query FileChunk table to see:
# - How many chunks per file
# - Chunk content quality
# - Embedding presence
```

**Check file processing:**
```sql
-- In Prisma Studio or psql
SELECT "fileName", status, "errorMessage"
FROM "ClassFile"
WHERE status = 'FAILED';
```

## Common Tasks

### Creating a Class

```typescript
// Teacher dashboard → Classes → Create Class
// OR use Prisma Studio → Class → Add Record
```

### Uploading Files

1. Navigate to teacher dashboard
2. Select class
3. Click "Upload Files"
4. Choose PDF/DOCX/TXT (max 25MB each)
5. Monitor processing status (PENDING → PROCESSING → COMPLETED)

**Processing time:**
- 10-page PDF: ~30 seconds
- 50-page PDF: ~2 minutes
- 200-page PDF: ~8 minutes

### Testing RAG Quality

1. Upload a test document
2. Wait for processing to complete
3. Join as a student (use invite code)
4. Ask specific questions from the document
5. Verify citations are accurate

**Good test questions:**
- "What is [specific topic from page X]?"
- "Summarize chapter Y"
- "Compare A and B" (tests multi-chunk retrieval)

## Useful Commands

### Development
```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npx prisma studio              # Visual database editor
npx prisma db push             # Push schema changes
npx prisma generate            # Regenerate Prisma Client
npx prisma migrate dev         # Create migration (use for version control)
npx prisma db seed             # Run seed script (if configured)
```

### Testing
```bash
# Test OpenAI connection
node -e "require('openai'); console.log('OpenAI SDK loaded')"

# Test database connection
npx prisma db execute --stdin <<< "SELECT 1"

# Check environment variables
node -e "console.log(process.env.OPENAI_API_KEY ? 'Set' : 'Missing')"
```

## Troubleshooting

### "Prisma Client not found"
```bash
npx prisma generate
# Restart dev server
```

### "Cannot connect to database"
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
npx prisma db execute --stdin <<< "SELECT 1"

# If using local Postgres, ensure it's running
# macOS: brew services list
# Linux: sudo systemctl status postgresql
```

### "pgvector extension not found"
```bash
# Connect to database
psql -U postgres -d greekdemo

# Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx vector
```

### "OpenAI API error"
- Verify `OPENAI_API_KEY` is set correctly in `.env.local`
- Check API quota: https://platform.openai.com/usage
- Ensure billing is enabled for your OpenAI account
- Rate limits: Text embedding (3000 RPM), GPT-4o-mini (500 RPM)

### "File processing failed"
- Check file is not corrupted (try opening locally)
- Verify file size is under 25MB
- Check OpenAI API key and quota
- Look at error message in ClassFile table
- Try retry button in teacher dashboard

### "Vector search returns no results"
- Verify embeddings exist: `SELECT COUNT(*) FROM "FileChunk" WHERE embedding IS NOT NULL`
- Check if file processing completed
- Ensure query is meaningful (not just punctuation)
- Try adjusting `minSimilarity` in `vectorSearch.ts`

### "Slow search performance"
- Ensure vector indexes are created (check `schema.prisma`)
- Consider reducing `initialK` in RAG_CONFIG
- Monitor database performance with `EXPLAIN ANALYZE`
- For production, use connection pooling (PgBouncer)

## Performance Optimization

### For Large Document Collections

1. **Increase `initialK` for better recall:**
   ```typescript
   // lib/config.ts
   initialK: 50,  // From 30
   ```

2. **Add database indexes:**
   ```sql
   CREATE INDEX idx_chunk_class_type
   ON "FileChunk"("classId", "chunkType");
   ```

3. **Use database connection pooling:**
   - Vercel Postgres includes pooling
   - For self-hosted: Use PgBouncer

4. **Monitor costs:**
   - OpenAI embeddings: $0.00002 per 1K tokens
   - GPT-4o-mini: $0.000150 per 1K tokens
   - Reranking adds ~2x API cost but improves quality

### For Better Answer Quality

1. **Adjust chunk sizes:**
   ```typescript
   // lib/chunking/hierarchical-chunker.ts
   parentMinTokens: 2500,  // From 2000
   childTargetTokens: 500, // From 400
   ```

2. **Increase context:**
   ```typescript
   // lib/config.ts
   finalK: 7,  // From 5
   ```

3. **Tune weights:**
   ```typescript
   // For technical documents (exact terms matter)
   vectorWeight: 0.5,
   bm25Weight: 0.5,

   // For conceptual content
   vectorWeight: 0.8,
   bm25Weight: 0.2,
   ```

## Deployment

### Deploying to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Visit https://vercel.com
   - Import your GitHub repository
   - Vercel auto-detects Next.js

3. **Configure Environment Variables**
   - In Vercel dashboard: Settings → Environment Variables
   - Add all variables from `.env.local`:
     - `DATABASE_URL`
     - `DATABASE_URL_UNPOOLED`
     - `OPENAI_API_KEY`
     - `BLOB_READ_WRITE_TOKEN`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL` (your production URL)

4. **Deploy**
   - Vercel auto-deploys on every push to main
   - View logs in Vercel dashboard

### Post-Deployment Checklist

- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] OpenAI API key working
- [ ] File uploads working
- [ ] Vector search returning results
- [ ] Authentication working
- [ ] Invite codes generating

## Resources

### Documentation
- [Next.js](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [pgvector](https://github.com/pgvector/pgvector)
- [OpenAI API](https://platform.openai.com/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel](https://vercel.com/docs)

### Learning RAG
- [RAG from Scratch](https://www.youtube.com/watch?v=sVcwVQRHIc8) - Video series
- [Advanced RAG Techniques](https://www.llamaindex.ai/blog/advanced-rag-techniques-an-illustrated-overview)
- [Hierarchical Chunking](https://www.pinecone.io/learn/chunking-strategies/)

### Papers & Research
- [Dense Passage Retrieval](https://arxiv.org/abs/2004.04906)
- [ColBERT](https://arxiv.org/abs/2004.12832) - Late interaction
- [BM25](https://en.wikipedia.org/wiki/Okapi_BM25) - Classic keyword search

## Support & Contributing

- **Issues**: Open an issue on GitHub
- **Questions**: Check discussions or ask in issues
- **Contributing**: PRs welcome! Please follow existing code style

## License

MIT

---

**Built with Next.js, Prisma, PostgreSQL, pgvector, and OpenAI**

**Features enterprise-grade RAG with hierarchical chunking, hybrid search, and cross-encoder reranking**
