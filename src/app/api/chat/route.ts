import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { question, cvText, apiKey } = await req.json();

    // Use environment variable first, fallback to the one passed from local storage
    const geminiKey = process.env.Gemini_API_Key || apiKey;

    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key is missing. Please set it in Settings.' }, { status: 400 });
    }

    const prompt = `You are an expert AI interview assistant helping a candidate. You are acting AS the candidate. 
Based on the following CV, answer the interview question professionally, confidently, and concisely.
Use the first person ("I", "my"). Keep the answer under 4 sentences so it is easy to read and say aloud.

CV Content:
${cvText}

Interview Question:
"${question}"
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
        return NextResponse.json({ error: data.error?.message || 'Error from Gemini API' }, { status: 500 });
    }

    const answer = data.candidates[0].content.parts[0].text;
    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
