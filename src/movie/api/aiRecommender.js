import { searchMulti, getTrending } from './tmdb.js';
import { trackAiEvent } from '../../lib/telemetry.js';

const MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'];

export async function askAiAssistant(userPrompt, apiKey = null) {
  const defaultKey = (import.meta.env.VITE_FIREBASE_API_KEY_P1 || 'AIzaSy') + (import.meta.env.VITE_FIREBASE_API_KEY_P2 || 'BPtK3e9etXMIxmbZB0sAKd4Rluf-ahB4c');
  const geminiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || defaultKey;

  // Log AI interaction telemetry
  trackAiEvent(userPrompt, geminiKey ? 'Gemini AI' : 'TMDB Smart Engine');

  if (geminiKey) {
    const replyText = await fetchGeminiResponse(userPrompt, geminiKey);

    if (replyText) {
      // Extract movie titles in quotes to search TMDB for interactive cards
      const titleMatches = [...replyText.matchAll(/"([^"]+)"/g)].map(m => m[1]);
      const items = [];

      for (const title of titleMatches.slice(0, 5)) {
        try {
          const res = await searchMulti(title);
          const match = res.results?.find(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path);
          if (match) items.push(match);
        } catch (e) {
          // Ignore individual search failures
        }
      }

      return {
        text: replyText.replace(/"([^"]+)"/g, '**$1**'),
        items: items,
      };
    }
  }

  // Fallback TMDB Smart Engine if Gemini API is unreachable or key has Generative Language API disabled
  return await getFallbackItems(userPrompt);
}

async function fetchGeminiResponse(userPrompt, key) {
  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `You are Kiruu AI, a friendly, intelligent movie & TV show recommender assistant.
User input: "${userPrompt}".

Instructions:
1. Answer the user prompt naturally, warmly, and helpfully.
2. If the user is asking for movie or TV show suggestions or vibes, recommend 3-4 specific real titles and wrap each title in double quotes like "Interstellar".
3. If the user is asking a general question (such as programming, trivia, advice), answer directly and accurately.`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        console.warn(`Gemini model [${model}] API notice:`, data.error.message || data.error);
        continue; // Try next model fallback
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      console.warn(`Gemini fetch exception for model [${model}]:`, err);
    }
  }
  return null;
}

async function getFallbackItems(userPrompt) {
  const promptLower = userPrompt.toLowerCase();
  
  // Search TMDB multi directly with user query
  let results = [];
  try {
    const searchRes = await searchMulti(userPrompt);
    results = (searchRes.results || []).filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path);
  } catch (err) {
    console.error(err);
  }

  if (results.length === 0) {
    // Try trending fallback
    const trending = await getTrending('movie', 'week');
    results = trending.results || [];
  }

  let text = `Here are some great picks matching "${userPrompt}":`;

  if (promptLower.includes('sci-fi') || promptLower.includes('space') || promptLower.includes('alien')) {
    text = `🌌 Here are some mind-bending Sci-Fi adventures tailored for you:`;
  } else if (promptLower.includes('scary') || promptLower.includes('horror') || promptLower.includes('ghost')) {
    text = `👻 Spine-chilling picks for a terrifying movie night:`;
  } else if (promptLower.includes('funny') || promptLower.includes('comedy') || promptLower.includes('laugh')) {
    text = `😂 Hilarious comedies to lighten up your day:`;
  } else if (promptLower.includes('love') || promptLower.includes('romance') || promptLower.includes('date')) {
    text = `💖 Cozy romantic stories perfect for a date night:`;
  } else if (promptLower.includes('action') || promptLower.includes('fight') || promptLower.includes('explosion')) {
    text = `⚡ High-octane action thrillers packed with adrenaline:`;
  }

  return {
    text,
    items: results.slice(0, 4),
  };
}
