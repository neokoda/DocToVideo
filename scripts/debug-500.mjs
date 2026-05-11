/**
 * Fires ONE narration call to gemma-4-26b-a4b-it and prints the full error.
 * Run: node scripts/debug-500.mjs
 */
import { GoogleGenAI } from '@google/genai';

const GEMINI_KEY = 'GEMINI_API_KEY_REDACTED';
const MODEL = 'gemma-4-26b-a4b-it';

const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

const SYSTEM = `You are an expert content narrator transforming documents into engaging spoken walkthroughs.
Rules:
- 90–150 words per scene (45–75 seconds at normal speaking pace)
- Sound natural when read aloud — no bullet points
- Preserve all factual claims exactly; do not embellish
- Connect each scene to the document's overall narrative
Return ONLY a raw JSON object (no markdown, no explanation):
{"narration_script":"...","key_claims":[{"text":"...","highlight_type":"statistic|key_term|call_to_action|conclusion","position_hint":"heading|body|footer"}],"callouts":[{"text":"...","callout_type":"emphasis|definition|example|warning","delay_s":5}],"estimated_duration_s":60}`;

const USER = `Document: "Attention Is All You Need" — Scene 1 of 9: "Introduction"

Content:
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.`;

async function run() {
  for (let i = 1; i <= 5; i++) {
    process.stdout.write(`Attempt ${i}… `);
    try {
      const r = await ai.models.generateContent({
        model: MODEL,
        config: { systemInstruction: SYSTEM },
        contents: [{ role: 'user', parts: [{ text: USER }] }],
      });
      console.log('OK —', r.text?.slice(0, 80));
    } catch (e) {
      console.log('ERROR');
      // Print every property on the error object
      console.log('  message :', e.message);
      console.log('  name    :', e.name);
      console.log('  status  :', e.status ?? e.statusCode ?? '(none)');
      console.log('  code    :', e.code ?? '(none)');
      // Google GenAI SDK often attaches response / errorDetails
      if (e.errorDetails) console.log('  errorDetails:', JSON.stringify(e.errorDetails, null, 2));
      if (e.response)     console.log('  response:', JSON.stringify(e.response, null, 2));
      // Catch-all: print all own keys
      const keys = Object.keys(e).filter(k => !['message','name','stack'].includes(k));
      if (keys.length) {
        for (const k of keys) {
          try { console.log(`  ${k}:`, JSON.stringify(e[k], null, 2)); } catch { console.log(`  ${k}:`, e[k]); }
        }
      }
      if (e.stack) console.log('  stack:\n' + e.stack.split('\n').slice(0, 6).join('\n'));
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

run();
