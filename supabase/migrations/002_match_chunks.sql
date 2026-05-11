-- RAG similarity search function
-- Returns the top-k chunks for a given document sorted by cosine similarity

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding  vector(3072),
  p_document_id    uuid,
  match_count      int     DEFAULT 6,
  match_threshold  float   DEFAULT 0.5
)
RETURNS TABLE (
  id             uuid,
  content        text,
  scene_id       uuid,
  scene_title    text,
  similarity     float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    dc.id,
    dc.content,
    dc.scene_id,
    s.title        AS scene_title,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  LEFT JOIN scenes s ON s.id = dc.scene_id
  WHERE
    dc.document_id = p_document_id
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
