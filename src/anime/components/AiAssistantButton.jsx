import { useState } from 'react';
import AiAssistantModal from './AiAssistantModal.jsx';

export default function AiAssistantButton({ navigate }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Spark Button */}
      <div className="fixed bottom-6 right-6 z-[10000]">
          <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative group p-3.5 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 text-white shadow-xl hover:shadow-pink-500/50 hover:scale-110 transition-all duration-300 border border-white/20 flex items-center justify-center cursor-pointer"
          title="キルー AI Assistant"
        >
          {/* Animated Glow Ring */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 opacity-75 blur animate-pulse group-hover:opacity-100 transition-opacity" />

          {/* AI Logo */}
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none" />
              <path d="M9 15c.8 1.2 2.2 2 3.5 1.8 1.1-.2 2-.9 2.5-1.8" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" />
              <line x1="20" y1="9" x2="23" y2="9" />
              <line x1="20" y1="15" x2="23" y2="15" />
              <line x1="1" y1="9" x2="4" y2="9" />
              <line x1="1" y1="15" x2="4" y2="15" />
            </svg>
          </div>
        </button>
      </div>

      {/* Modal */}
      <AiAssistantModal navigate={navigate} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
