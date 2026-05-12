export interface QACitation {
  quote: string;
  scene_title: string;
}

export interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: QACitation[];
  created_at: string;
  is_streaming?: boolean;
}

export interface QASourceChunk {
  chunk_id: string;
  scene_index: number;
  scene_title: string;
  similarity_score: number;
}
