import { searchMulti, getTrending } from './tmdb.js';

const GENRE_MAP = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  scifi: 878,
  'sci-fi': 878,
  science: 878,
  thriller: 53,
  war: 10752,
  western: 37,
};

export async function askAiAssistant(userPrompt, apiKey = null) {
  const geminiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY;

  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `You are Kiruu AI, a friendly and expert movie & TV show recommender assistant.
The user prompt is: "${userPrompt}".
Provide a warm, enthusiastic 2-3 sentence recommendation introduction, followed by a list of 4 specific movie or TV show title titles matching their query. Format the title names inside double quotes like "Movie Title".`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (replyText) {
        // Extract movie titles in quotes to search TMDB
        const titleMatches = [...replyText.matchAll(/"([^"]+)"/g)].map(m => m[1]);
        const items = [];

        for (const title of titleMatches.slice(0, 5)) {
          const res = await searchMulti(title);
          const match = res.results?.find(r => r.media_type === 'movie' || r.media_type === 'tv');
          if (match) items.push(match);
        }

        return {
          text: replyText.replace(/"([^"]+)"/g, '**$1**'),
          items: items.length > 0 ? items : await getFallbackItems(userPrompt),
        };
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to TMDB Smart Engine:", err);
    }
  }

  // Fallback TMDB Smart Engine
  return await getFallbackItems(userPrompt);
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
