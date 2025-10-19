'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithPDF } from '@/app/actions/chat';

type Props = {
  pdfId: string;
  extractedText: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatbotTab({ pdfId, extractedText }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to UI
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Call server action with full conversation history
      const result = await chatWithPDF(pdfId, userMessage, messages);

      if (result.success) {
        // Add assistant response
        setMessages([...newMessages, { role: 'assistant', content: result.response }]);
      } else {
        // Show error message
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: `Sorry, I encountered an error: ${result.error}. Please try again.`,
          },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-bold mb-2 text-blue-400">RAG Chatbot</h3>
            <p className="text-sm max-w-md mx-auto mb-6 text-gray-400">
              Ask questions about the content in your PDF. The AI will search through the document
              and provide relevant answers based on the material.
            </p>
            <div className="mt-6 text-left max-w-md mx-auto bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm font-medium text-gray-300 mb-2">Example questions:</p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• What is the main topic of this document?</li>
                <li>• Explain the grammar rule mentioned in this text</li>
                <li>• What Greek vocabulary words are introduced?</li>
                <li>• How do you conjugate this verb?</li>
                <li>• What does [Greek word] mean?</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100 border border-gray-700'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-2">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="text-gray-100 mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                          em: ({ children }) => <em className="text-blue-300">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-5 text-gray-200 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 text-gray-200 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-gray-200">{children}</li>,
                          code: ({ children }) => <code className="bg-gray-700 px-1.5 py-0.5 rounded text-blue-300">{children}</code>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="loading loading-dots loading-sm text-blue-400"></span>
                    <span className="text-sm text-gray-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4 bg-gray-800">
        {!extractedText ? (
          <div className="alert alert-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>No text extracted from this PDF. Please upload a text-based PDF.</span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask a question about your PDF..."
                className="input input-bordered flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="btn btn-primary"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
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
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Press Enter to send • The AI will reference the PDF content in its answers
            </p>
          </>
        )}
      </div>
    </div>
  );
}
