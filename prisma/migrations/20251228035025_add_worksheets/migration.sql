-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TEACHER', 'STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "FileProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChunkType" AS ENUM ('PARENT', 'CHILD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassMembership" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'student',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassFile" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "status" "FileProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileChunk" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "chunkIndex" INTEGER NOT NULL,
    "chunkType" "ChunkType" NOT NULL DEFAULT 'CHILD',
    "parentId" TEXT,
    "pageNumber" INTEGER,
    "section" TEXT,
    "topic" TEXT,
    "hasImages" BOOLEAN NOT NULL DEFAULT false,
    "imageDesc" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worksheet" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Worksheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorksheetSubmission" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorksheetSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");

-- CreateIndex
CREATE INDEX "Class_isActive_idx" ON "Class"("isActive");

-- CreateIndex
CREATE INDEX "ClassMembership_classId_idx" ON "ClassMembership"("classId");

-- CreateIndex
CREATE INDEX "ClassMembership_userId_idx" ON "ClassMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMembership_classId_userId_key" ON "ClassMembership"("classId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_code_idx" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_classId_isActive_idx" ON "InviteCode"("classId", "isActive");

-- CreateIndex
CREATE INDEX "ClassFile_classId_idx" ON "ClassFile"("classId");

-- CreateIndex
CREATE INDEX "ClassFile_status_idx" ON "ClassFile"("status");

-- CreateIndex
CREATE INDEX "ClassFile_uploadedBy_idx" ON "ClassFile"("uploadedBy");

-- CreateIndex
CREATE INDEX "FileChunk_fileId_idx" ON "FileChunk"("fileId");

-- CreateIndex
CREATE INDEX "FileChunk_classId_idx" ON "FileChunk"("classId");

-- CreateIndex
CREATE INDEX "FileChunk_parentId_idx" ON "FileChunk"("parentId");

-- CreateIndex
CREATE INDEX "FileChunk_chunkType_idx" ON "FileChunk"("chunkType");

-- CreateIndex
CREATE INDEX "FileChunk_classId_chunkType_idx" ON "FileChunk"("classId", "chunkType");

-- CreateIndex
CREATE INDEX "Worksheet_classId_idx" ON "Worksheet"("classId");

-- CreateIndex
CREATE INDEX "Worksheet_createdBy_idx" ON "Worksheet"("createdBy");

-- CreateIndex
CREATE INDEX "WorksheetSubmission_worksheetId_idx" ON "WorksheetSubmission"("worksheetId");

-- CreateIndex
CREATE INDEX "WorksheetSubmission_studentId_idx" ON "WorksheetSubmission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorksheetSubmission_worksheetId_studentId_key" ON "WorksheetSubmission"("worksheetId", "studentId");

-- CreateIndex
CREATE INDEX "ChatConversation_userId_idx" ON "ChatConversation"("userId");

-- CreateIndex
CREATE INDEX "ChatConversation_classId_createdAt_idx" ON "ChatConversation"("classId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatConversation_userId_classId_idx" ON "ChatConversation"("userId", "classId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFile" ADD CONSTRAINT "ClassFile_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileChunk" ADD CONSTRAINT "FileChunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ClassFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileChunk" ADD CONSTRAINT "FileChunk_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FileChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worksheet" ADD CONSTRAINT "Worksheet_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetSubmission" ADD CONSTRAINT "WorksheetSubmission_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "Worksheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetSubmission" ADD CONSTRAINT "WorksheetSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
