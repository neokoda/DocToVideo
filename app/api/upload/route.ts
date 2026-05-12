import { NextRequest, after } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { processDocument } from '@/lib/pipeline';

// Give Vercel up to 300s for the pipeline (Pro plan); Hobby caps at 60s
export const maxDuration = 300;

const ACCEPTED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

function requireAdmin(request: NextRequest): Response | null {
  const key = request.headers.get('X-Admin-Key');
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const slidesUrl = formData.get('slides_url') as string | null;
  const title = formData.get('title') as string | null;

  let source_type: string;
  let source_url: string | null = null;
  let fileBuffer: ArrayBuffer | null = null;
  let contentType: string | null = null;
  let ext: string | null = null;

  if (slidesUrl) {
    source_type = 'google_slides';
    source_url = slidesUrl;
  } else if (file) {
    const detectedType = ACCEPTED_TYPES[file.type];
    if (!detectedType) return Response.json({ error: 'Unsupported file type' }, { status: 400 });
    if (file.size > MAX_SIZE) return Response.json({ error: 'File too large (max 25MB)' }, { status: 400 });
    source_type = detectedType;
    contentType = file.type;
    ext = detectedType;
    fileBuffer = await file.arrayBuffer();
  } else {
    return Response.json({ error: 'No file or URL provided' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // Insert document row
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      title: title || (file ? file.name.replace(/\.[^.]+$/, '') : 'Untitled'),
      source_type,
      source_url,
      status: 'pending',
    })
    .select()
    .single();

  if (docErr || !doc) {
    return Response.json({ error: 'Failed to create document record' }, { status: 500 });
  }

  // Upload file to Supabase Storage (if not Google Slides)
  let file_storage_path: string | null = null;
  if (fileBuffer && ext) {
    const path = `${doc.id}/original.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(path, fileBuffer, { contentType: contentType!, upsert: false });

    if (uploadErr) {
      await supabase.from('documents').update({ status: 'failed', error_message: uploadErr.message }).eq('id', doc.id);
      return Response.json({ error: 'File upload failed' }, { status: 500 });
    }
    file_storage_path = path;
  }

  // Run pipeline after response is sent — `after()` keeps the function alive on Vercel
  after(async () => {
    try {
      await processDocument(doc.id);
    } catch (err) {
      console.error('[pipeline] processDocument failed:', err instanceof Error ? err.message : err);
    }
  });

  return Response.json({ document_id: doc.id, status: 'pending' }, { status: 201 });
}
