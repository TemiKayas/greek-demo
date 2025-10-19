# Modern Greek Education Demo

A simple MVP platform demonstrating AI-powered educational tools for Modern Greek language learning. This local demo showcases three core features: a RAG chatbot, worksheet generation, and flashcard creation - all powered by PDF materials.

## Overview

This project is a proof-of-concept for educational tools that will be integrated into a larger Modern Greek education app. It demonstrates how AI can transform static PDF learning materials into interactive, engaging study resources.

## Features

### 1. RAG Chatbot
- Upload Greek language PDFs (textbooks, lessons, articles)
- Chat with an AI that retrieves relevant information from your materials
- Ask questions about grammar, vocabulary, or content in the PDFs
- Get contextual answers based on the uploaded materials

### 2. Worksheet Generator
- Automatically create practice worksheets from PDF content
- Generate exercises based on the material (fill-in-the-blank, comprehension questions, etc.)
- Customizable difficulty levels
- Export worksheets for classroom use

### 3. Flashcard Builder
- Extract key vocabulary and concepts from PDFs
- Auto-generate flashcards with Greek terms and definitions
- Support for Greek-English and English-Greek cards
- Review mode for studying

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **Database**: SQLite (via Prisma)
- **ORM**: Prisma
- **File Storage**: Local filesystem
- **AI**: Google Gemini API
- **PDF Processing**: pdf-parse

## Local Setup

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### 1. Clone & Install

```bash
cd greek-demo
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Database (SQLite - local file)
DATABASE_URL="file:./dev.db"

# Google Gemini API
GEMINI_API_KEY="your-gemini-api-key-here"

# File Upload Directory (optional - defaults to ./uploads)
UPLOAD_DIR="./uploads"
```

#### Getting Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **Get API Key**
3. Create a new API key or use an existing one
4. Copy the key and paste it in `.env.local`

### 3. Database Setup

Initialize the SQLite database:

```bash
# Generate Prisma Client
npx prisma generate

# Create the database and tables
npx prisma db push

# Optional: Open Prisma Studio to view your local database
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Try It Out!

1. Upload a Greek language PDF (or any educational PDF)
2. Wait for it to be processed
3. Try the RAG chatbot to ask questions about the content
4. Generate a worksheet or flashcards from the material

## Project Structure

```
greek-demo/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page
│   ├── upload/            # PDF upload interface
│   ├── chat/              # RAG chatbot interface
│   ├── materials/         # Worksheet & flashcard generators
│   └── actions/           # Server Actions
├── components/            # React Components
│   ├── upload/
│   ├── chat/
│   └── materials/
├── lib/                   # Utilities & Config
│   ├── db.ts             # Prisma client
│   ├── processors/       # Business logic
│   │   ├── pdf-processor.ts
│   │   ├── rag.ts
│   │   ├── worksheet-generator.ts
│   │   └── flashcard-generator.ts
│   └── utils/            # Utility functions
├── prisma/               # Database schema
│   ├── schema.prisma     # Database models
│   └── dev.db            # SQLite database (generated)
├── uploads/              # Uploaded PDF files (generated)
└── public/               # Static assets
```

## Development Workflow

### Making Database Changes

1. Edit `prisma/schema.prisma`
2. Push changes to your local database:
   ```bash
   npx prisma db push
   ```
3. Regenerate Prisma Client:
   ```bash
   npx prisma generate
   ```

### Adding New Features

1. Check `TODO.txt` for planned features
2. Create necessary database models in `schema.prisma`
3. Write Server Actions in `app/actions/`
4. Create UI components in `components/`
5. Add pages in `app/`

## Database Schema

### Simplified Schema for MVP

- **User**: Demo user (minimal fields)
- **PDF**: Uploaded PDF files and metadata
- **ProcessedContent**: Extracted text from PDFs for RAG
- **Material**: Generated worksheets and flashcards

See `prisma/schema.prisma` for the full schema definition.

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
npx prisma db push             # Push schema changes to database
npx prisma generate            # Generate Prisma Client
npx prisma db seed             # Run seed script (if configured)
npx prisma migrate dev         # Create a migration (for version control)
```

## Troubleshooting

### "Prisma Client not found"
```bash
npx prisma generate
```

### "Cannot connect to database"
- Check that `DATABASE_URL` is set to `file:./dev.db` in `.env.local`
- Try deleting `prisma/dev.db` and running `npx prisma db push` again

### "Gemini API error"
- Verify `GEMINI_API_KEY` is correct in `.env.local`
- Check your API quota in [Google Cloud Console](https://console.cloud.google.com)
- Ensure billing is enabled (if required for your usage level)

### "pdf-parse errors"
- Make sure you restarted the dev server after installation
- Try reinstalling: `npm install pdf-parse`

### File upload not working
- Check that `UPLOAD_DIR` exists (create `./uploads` folder if needed)
- Verify file permissions on the uploads directory

## Future Features (See TODO.txt)

This is an MVP demo. Planned enhancements include:

- **Enhanced RAG**: Vector embeddings for better semantic search
- **More Material Types**: Quizzes, comprehension exercises, writing prompts
- **Greek-Specific Tools**: Grammar checkers, accent mark practice, conjugation drills
- **Export Options**: PDF, DOCX, and printable formats
- **User Accounts**: Save and organize materials
- **Multi-language**: Support for other languages beyond Greek

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [DaisyUI Components](https://daisyui.com)

## Support

For questions or issues:
- Check `TODO.txt` for development roadmap
- Review `CLAUDE.md` for technical implementation notes
- Open an issue on GitHub (if applicable)

## License

MIT

---

**Built for Modern Greek education with Next.js, Prisma, and Google Gemini**
