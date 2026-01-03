-- Add tsvector column for full-text search (BM25)
ALTER TABLE "FileChunk" ADD COLUMN "content_tsv" tsvector;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS "FileChunk_content_tsv_idx" ON "FileChunk" USING GIN ("content_tsv");

-- Create function to update tsvector column
CREATE OR REPLACE FUNCTION update_content_tsv() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update tsvector on insert/update
CREATE TRIGGER tsvector_update_trigger
BEFORE INSERT OR UPDATE OF content ON "FileChunk"
FOR EACH ROW
EXECUTE FUNCTION update_content_tsv();

-- Populate existing rows
UPDATE "FileChunk" SET content_tsv = to_tsvector('english', COALESCE(content, ''));

-- Create vector similarity index using HNSW (faster than IVFFlat for small-medium datasets)
CREATE INDEX IF NOT EXISTS "FileChunk_embedding_idx"
ON "FileChunk"
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;
