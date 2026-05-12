import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const supabase = getSupabaseServerClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('title, source_type')
    .eq('id', documentId)
    .single();

  if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });
  if (doc.source_type === 'google_slides') {
    return Response.json({ error: 'Google Slides documents cannot be downloaded' }, { status: 400 });
  }

  const storagePath = `${documentId}/original.${doc.source_type}`;
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 60); // 60-second expiry

  if (error || !data?.signedUrl) {
    return Response.json({ error: 'Could not generate download link' }, { status: 500 });
  }

  return Response.redirect(data.signedUrl, 302);
}
