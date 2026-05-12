import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { regenerateSections } from '@/lib/gemini';
import type { NarratedSection } from '@/types/document';

function deriveScript(sections: NarratedSection[]): string {
  return sections.map(s => s.content.replace(/\*\*/g, '')).join(' ');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  const adminKey = req.headers.get('X-Admin-Key');
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sceneId } = await params;
  const body = await req.json();
  const { narration_script: inputScript, sections: incomingSections } = body;

  const supabase = getSupabaseServerClient();

  // Direct sections save — re-derive narration_script from the edited sections
  if (!inputScript && incomingSections) {
    const narration_script = deriveScript(incomingSections);
    const { error } = await supabase
      .from('scenes')
      .update({ sections: incomingSections, narration_script })
      .eq('id', sceneId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true, sections: incomingSections, narration_script });
  }

  if (!inputScript || typeof inputScript !== 'string') {
    return Response.json({ error: 'narration_script or sections is required' }, { status: 400 });
  }

  // Script save → regenerate sections, then re-derive narration_script from them
  let sections: NarratedSection[] = [];
  try {
    sections = await regenerateSections(inputScript);
  } catch {
    sections = [];
  }
  if (sections.length === 0) {
    sections = [{ title: '', content: inputScript }];
  }

  // narration_script is always derived from sections so they're guaranteed identical
  const narration_script = deriveScript(sections);

  const { error } = await supabase
    .from('scenes')
    .update({ narration_script, sections })
    .eq('id', sceneId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, sections, narration_script });
}
