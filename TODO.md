# Greek Demo → Production MVP TODO

## 🎯 Product Vision
A production-ready education platform where teachers create classes, upload PDFs, generate AI-powered learning materials (flashcards, quizzes, worksheets), and share them with students. Students access materials, use the AI chatbot for questions, and track their learning history.

**Tech Stack:** Next.js 15 + Vercel Postgres (Neon) + Vercel Blob + NextAuth + Gemini AI + DaisyUI

---

## ✅ Already Built (Current Demo)
- [x] Dark theme with DaisyUI
- [x] Landing page (needs expansion)
- [x] Library page with tabs (Chatbot, Flashcards, Worksheets, Chat History)
- [x] Chatbot functionality with Gemini
- [x] Flashcard generation from PDFs
- [x] Worksheet generation
- [x] Chat history tracking
- [x] Basic PDF processing
- [x] Prisma schema setup

---

## 🚀 MVP Development Phases

### Phase 1: Database Schema & Infrastructure (Week 1) ✅
**Goal:** Production-ready database with class management

- [x] **Update Prisma Schema**
  - [x] Add `Class` model (teacher-owned)
  - [x] Add `ClassMembership` model (student enrollments)
  - [x] Add `ClassMaterial` model (link materials to classes)
  - [x] Add `InviteCode` model (class invite system)
  - [x] Update `User` model with proper relationships
  - [x] Update `PDF` model with class associations
  - [x] Update `ChatConversation` with classId/materialId context
  - [x] Add `ChatMessage` model for structured messages
  - [x] Add indexes for performance (especially chat insights queries)

- [x] **Vercel Setup**
  - [x] Create Vercel project
  - [x] Set up Vercel Postgres (Neon)
  - [x] Set up Vercel Blob storage
  - [x] Configure environment variables (.env.local + .env)
  - [x] Run initial migrations (prisma db push)
  - [x] Test database connection
  - [x] Verify Prisma Client generation

**Environment Variables (Completed):**
```bash
# Database (auto-added by Vercel Postgres)
DATABASE_URL="postgresql://..."                 # Pooled connection
DATABASE_URL_UNPOOLED="postgresql://..."        # Direct connection
POSTGRES_PRISMA_URL="postgresql://..."          # Prisma-optimized
# ... plus other Vercel Postgres vars

# Storage (auto-added by Vercel Blob)
BLOB_READ_WRITE_TOKEN="<token>"

# Auth (needs manual setup in Phase 2)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"

# AI (existing)
GEMINI_API_KEY="<your-key>"
```

**Implementation Notes:**
- Prisma schema uses `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
- `.env` file created (Prisma prefers this over `.env.local`)
- All 11 models created with proper relations and indexes
- Chat conversations now track class and material context for teacher insights

---

### Phase 2: Authentication System (Week 1) ✅
**Goal:** Secure auth with teacher/student roles

- [x] **NextAuth.js Setup**
  - [x] Create `lib/auth.ts` with NextAuth config
  - [x] Set up Credentials provider
  - [x] Implement password hashing (bcryptjs)
  - [x] Add JWT with role claims
  - [x] Type extensions for session/user

- [x] **Auth Pages**
  - [x] Login page (`app/(auth)/login/page.tsx`)
  - [x] Signup page with role selection (`app/(auth)/signup/page.tsx`)
  - [x] Server actions (`app/actions/auth.ts`)
  - [x] Form validation with Zod
  - [x] Error handling & loading states
  - [x] DaisyUI styled forms

- [x] **Route Protection**
  - [x] Create `middleware.ts`
  - [x] Protect teacher routes (`/classes`, `/library`)
  - [x] Protect student routes (`/dashboard`, `/history`)
  - [x] Allow public routes (`/`, `/login`, `/signup`)
  - [x] Role-based redirects after login

- [x] **Auth API Routes**
  - [x] NextAuth API handler (`app/api/auth/[...nextauth]/route.ts`)

- [x] **Database Integration**
  - [x] Update existing actions to require authentication
  - [x] Update chatHistory.ts for new schema
  - [x] Fix Material/PDF actions to include userId
  - [x] Add getClassChatHistory for teacher insights

---

### Phase 3: Class Management System (Week 1-2) ✅
**Goal:** Teachers can create and manage classes

- [x] **Class Creation & Management**
  - [x] Server actions (`app/actions/class.ts`)
    - [x] `createClass(name, description)` - Create class with auto-generated invite code
    - [x] `updateClass(classId, data)` - Update class info
    - [x] `deleteClass(classId)` - Delete class with cascade
    - [x] `getTeacherClasses()` - Get all teacher's classes with counts
    - [x] `getClassDetails(classId)` - Get class with students and codes
    - [x] `joinClassWithCode(code)` - Student joins via invite code

- [x] **Invite System**
  - [x] Generate unique 6-char codes (`lib/utils/invite-code.ts`)
  - [x] `generateNewInviteCode(classId, expiresIn?)` - Create additional codes
  - [x] `revokeInviteCode(codeId)` - Deactivate codes
  - [x] `validateInviteCode(code)` - Check validity, expiration
  - [x] QR code generation (`lib/utils/qr-code.ts`)
  - [x] Track usage count per code

- [x] **Teacher UI**
  - [x] Classes dashboard (`app/(teacher)/classes/page.tsx`)
    - [x] Grid view of all classes
    - [x] Student/material counts
    - [x] Create class modal with form
    - [x] Quick access to invite codes
  - [x] Class details page (`app/(teacher)/classes/[classId]/page.tsx`)
    - [x] Student roster with join dates
    - [x] Invite codes tab with QR codes
    - [x] Generate/revoke invite codes
    - [x] Copy invite links
    - [x] Delete class option
  - [x] QR code modal for easy sharing

- [x] **Student Join Flow**
  - [x] Public join page (`app/join/[code]/page.tsx`)
  - [x] Invite code validation
  - [x] Class preview before joining
  - [x] One-click join for students

---

### Phase 4: Student Enrollment & Management (Week 2) ✅
**Goal:** Students can join classes and view materials

- [x] **Student Join Flow**
  - [x] Public join page (`app/join/[code]/page.tsx`)
  - [x] Server action: `joinClassWithCode(code)`
  - [x] Handle logged-in students (guest mode deferred to post-MVP)
  - [x] Class preview before joining

- [x] **Student Actions**
  - [x] `getStudentClasses()` - list enrolled classes
  - [x] `leaveClass(classId)` - optional leave functionality
  - [x] `getClassMaterials(classId)` - view materials for a class

- [x] **Student UI**
  - [x] Student dashboard (`app/(student)/dashboard/page.tsx`)
  - [x] My classes list with teacher info and counts
  - [x] Class materials view (`app/(student)/classes/[classId]/materials/page.tsx`)
  - [x] Material type filtering (flashcards, worksheets, summaries)
  - [x] Links to material viewers (integrated with existing library page)

---

### Phase 5: Material Sharing System (Week 2)
**Goal:** Teachers share materials with specific classes

- [ ] **Material-Class Linking**
  - [ ] Server actions (`app/actions/materials.ts`)
    - [ ] `shareMaterialWithClass(materialId, classId)`
    - [ ] `unshareMaterial(materialId, classId)`
    - [ ] `getMaterialsForClass(classId)`
    - [ ] `getSharedClasses(materialId)`

- [ ] **Material Management UI**
  - [ ] Update library page to show "Share with Class" option
  - [ ] Class selector modal
  - [ ] Bulk share functionality
  - [ ] Material visibility indicators (which classes have access)

- [ ] **Student Material Access**
  - [ ] Filter materials by student's enrolled classes
  - [ ] Material detail pages with proper access control
  - [ ] Activity tracking (views, interactions)

---

### Phase 6: Enhanced Library & Material Generation (Week 2-3)
**Goal:** Improve existing features for production use

- [ ] **PDF Upload & Processing**
  - [ ] Move upload to teacher-only route
  - [ ] Upload to Vercel Blob
  - [ ] Link PDFs to classes during upload
  - [ ] Improve error handling
  - [ ] Add upload progress UI
  - [ ] File size & type validation (max 25MB)

- [ ] **AI Generation Improvements**
  - [ ] Refactor generation code for reusability
  - [ ] Add loading states
  - [ ] Add retry logic for API failures
  - [ ] Save generation settings/preferences
  - [ ] Add generation history

- [ ] **Library Page Updates**
  - [ ] Make teacher-specific
  - [ ] Add class filter dropdown
  - [ ] Improve material cards (show class associations)
  - [ ] Add search & filter functionality
  - [ ] Add bulk actions (delete, share, etc.)

---

### Phase 7: Student Learning Experience (Week 3)
**Goal:** Engaging student interface for using materials

- [ ] **Material Viewers**
  - [ ] Flashcard player component (interactive)
  - [ ] Worksheet viewer/printer
  - [ ] PDF viewer (in-app)
  - [ ] Quiz player (future enhancement)

- [ ] **Chatbot Enhancement**
  - [ ] Context-aware chatbot (material-specific)
  - [ ] Save chat conversations with class/material associations
  - [ ] Teacher dashboard to view all student chat histories
  - [ ] Filter chats by class, student, or material
  - [ ] Identify common student questions/struggles

- [ ] **Student History & Progress**
  - [ ] Chat history page (already built, needs styling)
  - [ ] Materials history (what they've viewed)
  - [ ] Activity tracking
  - [ ] Simple progress indicators

---

### Phase 8: UI/UX Polish (Week 3)
**Goal:** Production-quality interface

- [ ] **Design System**
  - [ ] Finalize DaisyUI theme
  - [ ] Add light/dark mode toggle
  - [ ] Remove purple/red colors (per notes)
  - [ ] Create consistent component library
  - [ ] Add loading skeletons
  - [ ] Improve error states

- [ ] **Landing Page**
  - [ ] Hero section
  - [ ] Features showcase
  - [ ] How it works section
  - [ ] Pricing/plans (if applicable)
  - [ ] Teacher vs Student CTAs
  - [ ] Demo video/screenshots

- [ ] **Responsive Design**
  - [ ] Mobile-first approach
  - [ ] Tablet optimization
  - [ ] Desktop layouts
  - [ ] Test on multiple devices

- [ ] **Fixes from Notes**
  - [ ] Fix white scroll thing
  - [ ] Remove purple colors
  - [ ] Remove red colors
  - [ ] Add light mode toggle

---

### Phase 9: Production Readiness (Week 3-4)
**Goal:** Security, performance, and reliability

- [ ] **Security**
  - [ ] Add rate limiting (Vercel Edge Config or Upstash)
  - [ ] Implement CSRF protection
  - [ ] Add input sanitization
  - [ ] Secure blob storage URLs (signed URLs)
  - [ ] Add role-based authorization checks everywhere

- [ ] **Performance**
  - [ ] Optimize database queries (add indexes)
  - [ ] Implement caching strategy
  - [ ] Optimize images (Next.js Image)
  - [ ] Code splitting
  - [ ] Monitor bundle size

- [ ] **Error Handling**
  - [ ] Global error boundary
  - [ ] Graceful API failure handling
  - [ ] User-friendly error messages
  - [ ] Error logging (Sentry or Vercel)

- [ ] **Data Management**
  - [ ] Soft delete for important records
  - [ ] Data retention policies
  - [ ] Backup strategy
  - [ ] Migration rollback plan

---

### Phase 10: Testing & Quality Assurance (Week 4)
**Goal:** Stable, bug-free MVP

- [ ] **Functional Testing**
  - [ ] Teacher flow: signup → create class → upload PDF → generate materials → share
  - [ ] Student flow: signup → join class → view materials → use chatbot
  - [ ] Invite code flow: generate → share → join → verify
  - [ ] Auth flow: login, logout, role-based access
  - [ ] Edge cases: expired invites, deleted classes, unauthorized access

- [ ] **Browser Testing**
  - [ ] Chrome/Edge
  - [ ] Firefox
  - [ ] Safari (desktop & mobile)
  - [ ] Mobile browsers (iOS Safari, Chrome)

- [ ] **Performance Testing**
  - [ ] Page load times
  - [ ] Large PDF processing
  - [ ] Multiple concurrent users
  - [ ] Blob storage upload/download speeds

---

### Phase 11: Deployment & Launch (Week 4)
**Goal:** Live production app

- [ ] **Pre-Deployment**
  - [ ] Set up production environment variables
  - [ ] Configure custom domain (if ready)
  - [ ] Set up Vercel Analytics
  - [ ] Set up error monitoring (Sentry)
  - [ ] Create deployment checklist

- [ ] **Deployment**
  - [ ] Deploy to Vercel production
  - [ ] Run database migrations
  - [ ] Verify all integrations work
  - [ ] Test critical paths in production

- [ ] **Post-Deployment**
  - [ ] Monitor error rates
  - [ ] Check performance metrics
  - [ ] Set up alerts for critical issues
  - [ ] Create user documentation (optional)

- [ ] **Launch Prep**
  - [ ] Prepare marketing materials
  - [ ] Set up user feedback channels
  - [ ] Plan beta testing (if applicable)
  - [ ] Create onboarding flow

---

## 📋 MVP Feature Scope (Keep Focused!)

### ✅ In Scope (MVP)
- Teacher creates classes
- Teacher uploads PDFs
- Teacher generates flashcards, worksheets, summaries
- Teacher shares materials with classes
- Teacher generates & shares invite codes/QR codes
- **Teacher views student chat histories (insights into student questions)**
- Student joins classes via invite code
- Student views shared materials
- Student uses AI chatbot for questions
- Student views their own chat history
- Basic analytics (view counts, chat activity)
- Dark/light mode

### ❌ Out of Scope (Post-MVP)
- Quizzes with auto-grading
- Real-time collaboration
- Assignment submissions
- Grading system
- Advanced analytics/reporting
- Mobile app
- Parent accounts
- LMS integrations
- Email notifications
- Payment/subscription system (unless needed)

---

## 🗓️ Timeline Summary

**Week 1:** ✅ Database (DONE), ✅ Auth (DONE), ✅ Class Management (DONE)
**Week 2:** ✅ Student Enrollment (DONE), Material Sharing (NEXT)
**Week 3:** UI Polish, Student Experience, Testing
**Week 4:** Final Testing, Deployment, Launch

**Total:** ~4 weeks to production-ready MVP
**Current Status:** Phase 1-4 Complete ✅ | Phase 5 Next (Material Sharing System)

---

## 🎯 Success Metrics (Define Later)

- Teachers can create a class and invite students in < 2 minutes
- Students can join a class in < 30 seconds
- PDF processing completes in < 30 seconds
- Chatbot responds in < 3 seconds
- 99.9% uptime
- Zero critical security issues

---

## 📝 Notes & Principles

- **Ship fast, iterate faster** - Don't over-engineer
- **Teacher experience first** - They're the paying customers
- **Mobile-friendly** - Many students use phones
- **Reliable AI** - Handle API failures gracefully
- **Clear pricing** - Decide on free vs paid tiers early
- **Data privacy** - Be FERPA/COPPA compliant if targeting schools

---

**Last Updated:** October 29, 2025
**Status:** Phase 1-4 Complete ✅ | Phase 5 Next (Material Sharing System)


add filters for pdf orgqniaagion 
Condense every lesson down to llm code to allow generation to work off of any weeks material, or atleast be able to see and summerize 
picture generator, have context allow AI to build image description and questions, then geneate image
iterate on work sheets more, a lot more
guided chatbots, give them information that theyll need, then put them into a sort of structured chat for that activity, like building muscle memory 

conversation from the greek games website, but generated consistenantly on the material we gave it

audio player + transcriber to store context as well

11/6
Progressive questions IE MC -> short answer -> long asnser ect, add prompts for worksheet generation, want to repate the same stuff
just more autonomy as you go on, asking them to do more 

Allow them to reopen or edit worksheets. 

give metrics for waht percent of the class got wrong or right, where are they struggling

image generation, along with content generation to go with the image. 

mp3 playing!! 

Anki flash card functions for flash cards. 

how can I accodmadate their teaching philosphies