export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type SourceType = 'pdf' | 'pptx' | 'docx' | 'google_slides';
export type HighlightType = 'statistic' | 'key_term' | 'call_to_action' | 'conclusion';
export type CalloutType = 'emphasis' | 'definition' | 'example' | 'warning';

export interface KeyClaim {
  text: string;
  highlight_type: HighlightType;
  position_hint: 'heading' | 'body' | 'footer';
}

export interface Callout {
  text: string;
  callout_type: CalloutType;
  delay_s: number;
}

// A semantic subsection of a scene's narration, with **bold** markers for emphasis
export interface NarratedSection {
  title: string;
  content: string;
}

export interface Scene {
  id: string;
  document_id: string;
  scene_index: number;
  title: string;
  raw_content: string;
  narration_script: string;
  key_claims: KeyClaim[];
  callouts: Callout[];
  sections: NarratedSection[];
  estimated_duration_s: number;
  slide_image_url: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  source_type: SourceType;
  source_url: string | null;
  status: DocumentStatus;
  error_message: string | null;
  scene_count: number | null;
  created_at: string;
  ready_at: string | null;
}

export interface DocumentWithScenes extends Document {
  scenes: Scene[];
}
