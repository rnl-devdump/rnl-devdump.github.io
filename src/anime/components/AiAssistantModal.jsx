import { useState, useRef, useEffect } from 'react';
import { askAiAssistant } from '../api/aiRecommender.js';
import { posterUrl } from '../api/jikan.js';

const DAILY_LIMIT = 10;

function getDailyUsage() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const stored = JSON.parse(localStorage.getItem('kiruu_ai_usage') || '{}');
    if (stored.date !== today) {
      return { date: today, count: 0 };
    }
    return stored;
  } catch (err) {
    return { date: today, count: 0 };
  }
}

function incrementDailyUsage() {
  const usage = getDailyUsage();
  usage.count += 1;
  localStorage.setItem('kiruu_ai_usage', JSON.stringify(usage));
  return usage.count;
}

export default function AiAssistantModal({ navigate, isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "👋 Hi! I'm **キルー AI**, your personal anime assistant! What kind of anime or genre are you looking for today?",
      items: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('kiruu_gemini_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [dailyCount, setDailyCount] = useState(getDailyUsage().count);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || loading) return;

    const currentUsage = getDailyUsage();
    if (currentUsage.count >= DAILY_LIMIT) {
      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: queryText },
        {
          sender: 'ai',
          text: "⚠️ **Daily Limit Reached!** You have used all 10 of your daily AI queries for today. Please come back tomorrow for more recommendations!",
          items: [],
        },
      ]);
      if (!textToSend) setInput('');
      return;
    }

    const userMsg = { sender: 'user', text: queryText };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    const newCount = incrementDailyUsage();
    setDailyCount(newCount);

    try {
      const res = await askAiAssistant(queryText, apiKey);
      const aiMsg = {
        sender: 'ai',
        text: res.text,
        items: res.items || [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: "Sorry, I had trouble finding recommendations. Please try asking again!", items: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('kiruu_gemini_key', apiKey);
    setShowSettings(false);
    alert("Gemini API key saved!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10005] flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:w-[440px] h-[85vh] sm:h-[600px] glass-card-dark rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden border border-white/10 shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg border border-pink-400/50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c-2.5-4-5-6-5-10a5 5 0 0 1 10 0c0 4-2.5 6-5 10z"/>
                <path d="M7 12c-4-2.5-6-5-10-5a5 5 0 0 1 0 10c4 0 6-2.5 10-5z" transform="rotate(72 12 12)" />
                <path d="M7 12c-4-2.5-6-5-10-5a5 5 0 0 1 0 10c4 0 6-2.5 10-5z" transform="rotate(144 12 12)" />
                <path d="M7 12c-4-2.5-6-5-10-5a5 5 0 0 1 0 10c4 0 6-2.5 10-5z" transform="rotate(216 12 12)" />
                <path d="M7 12c-4-2.5-6-5-10-5a5 5 0 0 1 0 10c4 0 6-2.5 10-5z" transform="rotate(288 12 12)" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2 tracking-wide">
                キルー AI
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-xs text-text-lo">
                {DAILY_LIMIT - dailyCount} / {DAILY_LIMIT} queries left today
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-text-lo hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="API Key Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-text-lo hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* API Settings Sub-panel */}
        {showSettings && (
          <form onSubmit={handleSaveApiKey} className="p-3 bg-black/40 border-b border-white/10 flex flex-col gap-2 animate-fade-in">
            <label className="text-xs text-text-lo font-medium">
              Gemini API Key (Optional for LLM power):
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-primary"
              />
              <button type="submit" className="btn-primary text-xs px-3 py-1.5">Save</button>
            </div>
          </form>
        )}

        {/* Chat Body */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col gap-2 max-w-[85%] ${
                msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              <div
                className={`p-3 rounded-2xl text-sm ${
                  msg.sender === 'user'
                    ? 'bg-primary text-white rounded-br-none'
                    : 'bg-white/10 text-white rounded-bl-none border border-white/5 backdrop-blur-md'
                }`}
              >
                {msg.text}
              </div>

              {/* Render Recommendation Cards */}
              {msg.items && msg.items.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-1 w-full">
                  {msg.items.map((item) => {
                    const title = item.title || item.name;
                    const isTv = item.media_type === 'tv';
                    const path = isTv ? `/tv/${item.id}` : `/movie/${item.id}`;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onClose();
                          navigate(path);
                        }}
                        className="bg-black/40 border border-white/10 hover:border-primary rounded-xl p-2 flex flex-col gap-2 cursor-pointer transition-all duration-200 hover:scale-105 group"
                      >
                        <div className="aspect-[2/3] w-full rounded-lg bg-white/5 overflow-hidden relative">
                          {item.poster_path ? (
                            <img src={posterUrl(item.poster_path, 'w185')} alt={title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-text-lo">No Art</div>
                          )}
                          <div className="absolute top-1 right-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400">
                            ★ {item.vote_average?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-white truncate group-hover:text-primary transition-colors">{title}</h4>
                          <span className="text-[10px] text-text-lo capitalize">{isTv ? 'TV Series' : 'Movie'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="self-start flex items-center gap-2 p-3 bg-white/10 rounded-2xl rounded-bl-none text-xs text-text-lo animate-pulse">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              キルー AI is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Preset Prompt Chips */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-white/5 no-scrollbar">
          {[
            "🗡️ Epic Isekai adventures",
            "💖 Wholesome slice of life",
            "🔥 Shounen with insane fights",
            "🧠 Psychological mind games",
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/10 text-text-lo whitespace-nowrap transition-all cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Footer */}
        <div className="p-3 bg-white/5 border-t border-white/10 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask キルー AI for anime picks..."
            className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-primary placeholder:text-text-lo"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="btn-primary p-2.5 rounded-xl flex items-center justify-center disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
