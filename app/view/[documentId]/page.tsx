import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DocumentPlayer } from '@/components/player/DocumentPlayer';
import type { DocumentWithScenes } from '@/types/document';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ documentId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { documentId } = await params;
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from('documents').select('title').eq('id', documentId).single();
  return { title: data?.title ? `${data.title} — DocToVideo` : 'DocToVideo' };
}

export default async function ViewPage({ params }: Props) {
  const { documentId } = await params;
  const supabase = getSupabaseServerClient();

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error || !doc) notFound();

  if (doc.status !== 'ready') {
    return (
      <main className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950">
            {doc.status === 'failed' ? 'Processing failed' : 'Processing…'}
          </h1>
          <p className="text-sm text-neutral-500">
            {doc.status === 'failed'
              ? doc.error_message ?? 'Something went wrong during processing.'
              : 'This document is still being processed. Please check back in a moment.'}
          </p>
          {doc.status !== 'failed' && (
            <script dangerouslySetInnerHTML={{ __html: 'setTimeout(() => location.reload(), 5000)' }} />
          )}
        </div>
      </main>
    );
  }

  const { data: scenes } = await supabase
    .from('scenes')
    .select('*')
    .eq('document_id', documentId)
    .order('scene_index', { ascending: true });

  const docWithScenes: DocumentWithScenes = { ...doc, scenes: scenes ?? [] };

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      <DocumentPlayer doc={docWithScenes} />
    </main>
  );
}
