'use client';

import { useState } from 'react';

type Props = {
  pdfId: string;
  extractedText: string;
};

export default function ChatbotTab({ pdfId, extractedText }: Props) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // TODO: Implement RAG chatbot logic
    // For now, just show a placeholder response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'RAG chatbot coming soon! This will search through your PDF and provide contextual answers.',
        },
      ]);
      setIsLoading(false);
    }, 1000);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-bold mb-2">RAG Chatbot</h3>
            <p className="text-sm max-w-md mx-auto">
              Ask questions about the content in your PDF. The AI will search through the document
              and provide relevant answers based on the material.
            </p>
            <div className="mt-6 text-left max-w-md mx-auto">
              <p className="text-sm font-medium text-gray-600 mb-2">Example questions:</p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• What is the main topic of this document?</li>
                <li>• Explain the grammar rule mentioned in section 2</li>
                <li>• What vocabulary words are introduced?</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-greek-blue text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <span className="loading loading-dots loading-sm"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question about your PDF..."
            className="input input-bordered flex-1"
            disabled={isLoading || !extractedText}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !extractedText}
            className="btn btn-primary"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        {!extractedText && (
          <p className="text-xs text-error mt-2">
            No text extracted from this PDF. Please upload a text-based PDF.
          </p>
        )}
      </div>
    </div>
  );
}
