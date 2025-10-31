'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithLesson } from '@/app/actions/chat';
import { saveLessonChatConversation } from '@/app/actions/chatHistory';

type Props = {
  classId: string;
  lessonId: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function StudentChatbot({ classId, lessonId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
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
      // Call server action with lesson and class context
      const result = await chatWithLesson(classId, lessonId, userMessage, messages);

      if (result.success) {
        // Add assistant response
        const updatedMessages = [...newMessages, { role: 'assistant' as const, content: result.response }];
        setMessages(updatedMessages);

        // Save conversation to database
        const saveResult = await saveLessonChatConversation(
          classId,
          lessonId,
          updatedMessages,
          conversationId
        );

        if (saveResult.success) {
          // Store conversation ID for future updates
          if (!conversationId) {
            setConversationId(saveResult.data.id);
          }
        } else {
          console.error('Failed to save conversation:', saveResult.error);
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
    <div className="h-full flex flex-col bg-base-100">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-base-content">AI Study Assistant</h3>
            <p className="text-sm sm:text-base max-w-md mx-auto mb-6 text-base-content/60">
              Ask me anything about this lesson's materials. I can help you understand concepts,
              review vocabulary, and answer questions based on the PDFs your teacher has shared.
            </p>
            <div className="space-y-2 text-sm text-base-content/70">
              <p className="font-semibold">Try asking:</p>
              <ul className="space-y-1 text-left max-w-md mx-auto">
                <li>• "What are the main topics in this lesson?"</li>
                <li>• "Can you explain [concept] in simpler terms?"</li>
                <li>• "Quiz me on the vocabulary"</li>
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
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-base-300 p-3 sm:p-4 bg-base-200">
        <div className="flex gap-2 sm:gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about this lesson..."
            className="input input-bordered flex-1 text-sm sm:text-base"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
          >
            {!isLoading && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
      </div>
    </div>
  );
}
