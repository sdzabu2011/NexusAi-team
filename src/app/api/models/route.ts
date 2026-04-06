import { NextResponse } from 'next/server';

export async function GET() {
  const models: string[] = [];
  try {
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/models');
    if (openRouterRes.ok) {
      const data = await openRouterRes.json();
      const freeModels = data.data?.filter((m: { id: string; pricing?: { prompt: string } }) => m.id.includes(':free') || m.pricing?.prompt === "0").map((m: { id: string }) => m.id);
      if(freeModels) models.push(...freeModels);
    }
  } catch (e) {
    console.error("OpenRouter fetch error", e);
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY }
    });
    if (groqRes.ok) {
        const data = await groqRes.json();
        const groqModels = data.data?.map((m: { id: string }) => 'groq/' + m.id);
        if(groqModels) models.push(...groqModels);
      }
  } catch (e) {
    console.error("Groq fetch error", e);
  }
  
  return NextResponse.json({ models: models.length ? models : ['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free', 'groq/llama3-8b-8192'] });
}
