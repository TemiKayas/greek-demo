'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithPDF } from '@/app/actions/chat';
import { saveChatConversation } from '@/app/actions/chatHistory';

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
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
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
        const updatedMessages = [...newMessages, { role: 'assistant' as const, content: result.response }];
        setMessages(updatedMessages);

        // Auto-save conversation after successful exchange
        const saveResult = await saveChatConversation(pdfId, updatedMessages, currentConversationId || undefined);
        if (saveResult.success && !currentConversationId) {
          // Store the conversation ID for future updates
          setCurrentConversationId(saveResult.data.id);
        }
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 bg-base-100">
        {messages.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-base-content">RAG Chatbot</h3>
            <p className="text-sm sm:text-base max-w-md mx-auto mb-6 text-base-content/60">
              Ask questions about the content in your PDF. The AI will search through the document
              and provide relevant answers based on the material.
            </p>
            <div className="mt-6 text-left max-w-md mx-auto card bg-base-200 border border-base-content/10 p-4">
              <p className="text-sm font-medium mb-2 text-primary">Example questions:</p>
              <ul className="text-sm text-base-content/70 space-y-1">
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
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 sm:px-4 py-2 sm:py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-200 text-base-content'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 text-sm sm:text-base">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                          em: ({ children }) => <em className="text-primary">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 text-sm sm:text-base">{children}</ol>,
                          li: ({ children }) => <li className="text-sm sm:text-base">{children}</li>,
                          code: ({ children }) => <code className="bg-base-300 px-1.5 py-0.5 rounded text-xs sm:text-sm text-primary">{children}</code>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words text-sm sm:text-base">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-base-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="loading loading-dots loading-sm text-primary"></span>
                    <span className="text-sm text-base-content/70">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-base-300 p-3 sm:p-4 bg-base-200">
        {!extractedText ? (
          <div className="alert alert-warning text-sm sm:text-base">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-5 w-5 sm:h-6 sm:w-6"
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
                className="input input-bordered flex-1 text-sm sm:text-base bg-base-100 text-base-content placeholder:text-base-content/50"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="btn btn-primary btn-sm sm:btn-md"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
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
            <p className="text-xs text-base-content/60 mt-2">
              Press Enter to send • Conversations are automatically saved to history
            </p>
          </>
        )}
      </div>
    </div>
  );
}
