import { searchMulti, getTrending } from './jikan.js';
import { trackAiEvent } from '../../lib/telemetry.js';

const MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'];

export async function askAiAssistant(userPrompt, apiKey = null) {
  const defaultKey = (import.meta.env.VITE_FIREBASE_API_KEY_P1 || 'AIzaSy') + (import.meta.env.VITE_FIREBASE_API_KEY_P2 || 'BPtK3e9etXMIxmbZB0sAKd4Rluf-ahB4c');
  const geminiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || defaultKey;

  // Rate Limiting Logic
  const today = new Date().toLocaleDateString();
  const usageKey = 'ai_usage_stats';
  let usage = JSON.parse(localStorage.getItem(usageKey) || '{"date":"","count":0}');
  
  if (usage.date !== today) {
    usage = { date: today, count: 0 };
  }
  
  if (usage.count >= 10) {
    return {
      text: "Whoa there! You've reached the limit of 10 AI requests per day to prevent abuse. Please try again tomorrow! 🌸",
      items: []
    };
  }

  // Log AI interaction telemetry
  trackAiEvent(userPrompt, geminiKey ? 'Gemini AI' : 'Jikan Smart Engine');

  if (geminiKey) {
    const replyText = await fetchGeminiResponse(userPrompt, geminiKey);

    if (replyText) {
      usage.count += 1;
      localStorage.setItem(usageKey, JSON.stringify(usage));

      // Extract anime titles in quotes to search Jikan for interactive cards
      const titleMatches = [...replyText.matchAll(/"([^"]+)"/g)].map(m => m[1]);
      const items = [];

      for (const title of titleMatches.slice(0, 5)) {
        try {
          const res = await searchMulti(title);
          // res is the data array for Jikan
          const match = res?.find(r => r.images?.jpg?.image_url);
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

  usage.count += 1;
  localStorage.setItem(usageKey, JSON.stringify(usage));
  // Fallback Jikan Smart Engine if Gemini API is unreachable or key has Generative Language API disabled
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
                    text: `You are Kiruu AI, a friendly, intelligent anime recommender assistant.
User input: "${userPrompt}".

Instructions:
1. Answer the user prompt naturally, warmly, and helpfully.
2. If the user is asking for anime suggestions or genres, recommend 3-4 specific real anime titles and wrap each title in double quotes like "Attack on Titan".
3. If the user is asking a general question (such as anime trivia, advice), answer directly and accurately.`,
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
  
  // Search Jikan multi directly with user query
  let results = [];
  try {
    const searchRes = await searchMulti(userPrompt);
    results = (searchRes || []).filter(r => r.images?.jpg?.image_url);
  } catch (err) {
    console.error(err);
  }

  if (results.length === 0) {
    // Try trending fallback
    const trending = await getTrending(1);
    results = trending || [];
  }

  let text = `Here are some great anime picks matching "${userPrompt}":`;

  if (promptLower.includes('sci-fi') || promptLower.includes('mecha') || promptLower.includes('space')) {
    text = `🌌 Here are some mind-bending sci-fi/mecha adventures tailored for you:`;
  } else if (promptLower.includes('isekai') || promptLower.includes('fantasy') || promptLower.includes('magic')) {
    text = `🗡️ Epic fantasy and isekai worlds waiting for you:`;
  } else if (promptLower.includes('funny') || promptLower.includes('comedy') || promptLower.includes('slice of life')) {
    text = `😂 Hilarious and wholesome picks to lighten up your day:`;
  } else if (promptLower.includes('love') || promptLower.includes('romance') || promptLower.includes('shoujo')) {
    text = `💖 Cozy romantic stories perfect for a binge:`;
  } else if (promptLower.includes('action') || promptLower.includes('shounen') || promptLower.includes('fight')) {
    text = `🔥 High-octane action anime packed with adrenaline:`;
  }

  return {
    text,
    items: results.slice(0, 4),
  };
}
