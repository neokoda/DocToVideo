import { NextRequest } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const VOICE = 'en-US-JennyNeural';

export async function POST(req: NextRequest) {
  const { text, rate = 1.0 } = await req.json();
  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'text required' }, { status: 400 });
  }

  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const { audioStream } = tts.toStream(text, { rate });

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const audio = Buffer.concat(chunks);

  return new Response(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': audio.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
