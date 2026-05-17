import { NextResponse } from 'next/server';

// Ordered list of models to try — primary first, then progressively faster/cheaper fallbacks
const MODEL_CHAIN = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemma-3-4b-it:free',
  'mistralai/mistral-7b-instruct:free',
];

const RETRY_DELAYS_MS = [500, 1000, 2000];

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function POST(req: Request) {
  try {
    const { question, cvText, systemPrompt } = await req.json();

    const openRouterKey = process.env.OPENROUTER_API_KEY;

    console.log('=== CHAT API REQUEST ===');
    console.log('OPENROUTER_API_KEY present:', !!openRouterKey);

    if (!openRouterKey) {
      console.error('Chat API Error: No API key found.');
      return NextResponse.json(
        { error: 'No API key configured. Please set OPENROUTER_API_KEY in Vercel.' },
        { status: 400 }
      );
    }

    const safeCvText = cvText ? cvText.substring(0, 20000) : '';

    const defaultSystemPrompt = `You are acting AS the candidate in a live job interview. 
Your goal is to sound like a real, confident human being having a natural, friendly conversation.
CRITICAL RULES:
1. NEVER recite your whole CV or sound like you are reading from a script.
2. Be conversational and casual but professional. It's okay to start sentences with "Well," "Sure," or "Yeah,".
3. Keep answers very brief (1 to 3 sentences maximum). Leave room for the interviewer to ask follow-up questions.
4. If asked a simple "hello" or "how are you", just reply naturally (e.g., "Hello! I'm doing great, thank you. I'm really excited to be here. How are you doing today?").
5. Only mention specific details from your CV if they directly answer the specific question asked.`;

    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;
    const userMessage = `CV Content:\n${safeCvText}\n\nInterview Question:\n"${question}"`;

    // Try each model in the chain; on 429 rotate to the next one
    for (let modelIdx = 0; modelIdx < MODEL_CHAIN.length; modelIdx++) {
      const model = MODEL_CHAIN[modelIdx];

      if (modelIdx > 0) {
        console.log(`[API] fallback activated — trying model: ${model}`);
      } else {
        console.log(`Using OpenRouter (${model})...`);
      }

      let response: Response | null = null;

      // Per-model retry loop for transient errors (not 429)
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
          response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openRouterKey}`,
              'HTTP-Referer': 'https://nemu-dashboard-ten.vercel.app',
              'X-Title': 'Nemu AI Interview Assistant',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: finalSystemPrompt },
                { role: 'user', content: userMessage },
              ],
              max_tokens: 300,
            }),
          });
        } catch (fetchErr: any) {
          console.warn(`[API] network error on attempt ${attempt + 1}:`, fetchErr.message);
          if (attempt < RETRY_DELAYS_MS.length) {
            await sleep(RETRY_DELAYS_MS[attempt]);
            continue;
          }
          break;
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          console.warn(`[API] 429 from OpenRouter — model=${model} attempt=${attempt + 1} retry-after=${retryAfter ?? 'none'}`);
          // Break out of per-model retry loop and try next model
          break;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.error(`[API] OpenRouter error: status=${response.status}`, JSON.stringify(data));

          if (attempt < RETRY_DELAYS_MS.length) {
            await sleep(RETRY_DELAYS_MS[attempt]);
            continue;
          }
          break;
        }

        // Success
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content;

        if (!answer) {
          console.error('[API] OpenRouter returned empty answer');
          return NextResponse.json({ error: 'No answer from OpenRouter.' }, { status: 500 });
        }

        console.log(`[API] answer received from model=${model}`);
        return NextResponse.json({ answer });
      }
    }

    // All models exhausted
    console.error('[API] All models returned 429 or failed — rate limit exceeded');
    return NextResponse.json(
      { error: 'AI provider is currently rate limited. Please wait a few seconds and try again.' },
      { status: 429 }
    );

  } catch (error: any) {
    console.error('Chat API Fatal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
