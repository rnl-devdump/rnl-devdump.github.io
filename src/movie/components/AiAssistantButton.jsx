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
          className="relative group p-3.5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-indigo-500/50 hover:scale-110 transition-all duration-300 border border-white/20 flex items-center justify-center cursor-pointer"
          title="Kiruu AI Assistant"
        >
          {/* Animated Glow Ring */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-75 blur animate-pulse group-hover:opacity-100 transition-opacity" />

          {/* Icon */}
          <div className="relative flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="hidden md:inline font-semibold text-xs pr-1">Ask AI</span>
          </div>
        </button>
      </div>

      {/* Modal */}
      <AiAssistantModal navigate={navigate} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
