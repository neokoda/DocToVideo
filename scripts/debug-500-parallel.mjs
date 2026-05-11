/**
 * Simulates the real pipeline: 3 parallel narration calls with long/complex content.
 * Run: node scripts/debug-500-parallel.mjs
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
Return ONLY a raw JSON object (no markdown, no explanation):
{"narration_script":"...","key_claims":[{"text":"...","highlight_type":"statistic|key_term|call_to_action|conclusion","position_hint":"heading|body|footer"}],"callouts":[{"text":"...","callout_type":"emphasis|definition|example|warning","delay_s":5}],"estimated_duration_s":60}`;

// Long complex content — mimics the Attention paper or DSA guide scenes
const SCENES = [
  {
    title: 'Scaled Dot-Product Attention',
    content: `We call our particular attention "Scaled Dot-Product Attention". The input consists of queries and keys of dimension dk, and values of dimension dv. We compute the dot products of the query with all keys, divide each by sqrt(dk), and apply a softmax function to obtain the weights on the values. In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix Q. The keys and values are also packed together into matrices K and V. We compute the matrix of outputs as: Attention(Q, K, V) = softmax(QK^T / sqrt(dk))V. The two most commonly used attention functions are additive attention, and dot-product (multiplicative) attention. Dot-product attention is identical to our algorithm, except for the scaling factor of 1/sqrt(dk). Additive attention computes the compatibility function using a feed-forward network with a single hidden layer. While the two are similar in theoretical complexity, dot-product attention is much faster and more space-efficient in practice, since it can be implemented using highly optimized matrix multiplication code.`,
  },
  {
    title: 'Multi-Head Attention',
    content: `Instead of performing a single attention function with dmodel-dimensional keys, values and queries, we found it beneficial to linearly project the queries, keys and values h times with different, learned linear projections to dk, dk and dv dimensions, respectively. On each of these projected versions of queries, keys and values we then perform the attention function in parallel, yielding dv-dimensional output values. These are concatenated and once again projected, resulting in the final values. Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this. MultiHead(Q, K, V) = Concat(head1, ..., headh)W^O where headi = Attention(QW_i^Q, KW_i^K, VW_i^V). In this work we employ h = 8 parallel attention layers, or heads. For each of these we use dk = dv = dmodel/h = 64. Due to the reduced dimension of each head, the total computational cost is similar to that of single-head attention with full dimensionality.`,
  },
  {
    title: 'Position-wise Feed-Forward Networks',
    content: `In addition to attention sub-layers, each of the layers in our encoder and decoder contains a fully connected feed-forward network, which is applied to each position separately and identically. This consists of two linear transformations with a ReLU activation in between. FFN(x) = max(0, xW1 + b1)W2 + b2. While the linear transformations are the same across different positions, they use different parameters from layer to layer. Another way of describing this is as two convolutions with kernel size 1. The dimensionality of input and output is dmodel = 512, and the inner-layer has dimensionality dff = 2048. We also experimented with using a single linear transformation with a larger inner dimension. The results were slightly worse, but the model trained faster. We use residual connections around each of the sub-layers, followed by layer normalization. That is, the output of each sub-layer is LayerNorm(x + Sublayer(x)), where Sublayer(x) is the function implemented by the sub-layer itself.`,
  },
];

async function callNarration(scene, idx) {
  const start = Date.now();
  const userMsg = `Document: "Attention Is All You Need" — Scene ${idx + 1} of 9: "${scene.title}"\n\nContent:\n${scene.content}`;
  try {
    const r = await ai.models.generateContent({
      model: MODEL,
      config: { systemInstruction: SYSTEM },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
    });
    const ms = Date.now() - start;
    return { idx, ok: true, ms, preview: (r.text ?? '').slice(0, 60) };
  } catch (e) {
    const ms = Date.now() - start;
    return {
      idx,
      ok: false,
      ms,
      message: e.message,
      name: e.name,
      status: e.status ?? e.statusCode ?? '(none)',
      code: e.code ?? '(none)',
      errorDetails: e.errorDetails ?? null,
      allKeys: Object.fromEntries(
        Object.keys(e)
          .filter(k => !['stack'].includes(k))
          .map(k => { try { return [k, JSON.stringify(e[k])]; } catch { return [k, String(e[k])]; } })
      ),
      stackTop: e.stack?.split('\n').slice(0, 4).join('\n'),
    };
  }
}

async function main() {
  console.log(`Running 3 rounds of 3 parallel calls (total 9)…\n`);
  for (let round = 0; round < 3; round++) {
    console.log(`Round ${round + 1}: launching 3 parallel calls…`);
    const results = await Promise.all(SCENES.map((s, i) => callNarration(s, i)));
    for (const r of results) {
      if (r.ok) {
        console.log(`  [${r.idx}] OK  (${r.ms}ms) — ${r.preview}`);
      } else {
        console.log(`  [${r.idx}] FAIL (${r.ms}ms)`);
        console.log(JSON.stringify(r, null, 2));
      }
    }
    console.log();
  }
}

main();
