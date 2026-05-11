export interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source_scenes?: string[];
  created_at: string;
  is_streaming?: boolean;
}

export interface QASourceChunk {
  chunk_id: string;
  scene_index: number;
  scene_title: string;
  similarity_score: number;
}
