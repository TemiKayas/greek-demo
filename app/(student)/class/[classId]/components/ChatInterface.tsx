'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getOrCreateConversation,
  sendChatMessage,
  getConversationMessages,
} from '@/app/actions/chat';

interface ChatInterfaceProps {
  classId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  sources?: Array<{
    fileName: string;
    fileId: string;
    similarity: number;
  }>;
}

export function ChatInterface({ classId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initializeChat = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Get or create conversation
    const convResult = await getOrCreateConversation(classId);
    if (!convResult.success) {
      setError(convResult.error);
      setLoading(false);
      return;
    }

    const convId = convResult.data.conversationId;
    setConversationId(convId);

    // Load existing messages
    const messagesResult = await getConversationMessages(convId);
    if (messagesResult.success) {
      setMessages(messagesResult.data.map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant',
      })));
    }

    setLoading(false);
  }, [classId]);

  useEffect(() => {
    initializeChat();
  }, [classId, initializeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !conversationId || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);
    setError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    // Send message
    const result = await sendChatMessage(conversationId, userMessage);

    if (result.success) {
      // Replace temp message with real message and add AI response
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMessage.id);
        return [
          ...withoutTemp,
          { ...tempUserMessage, id: tempUserMessage.id.replace('temp-', '') },
          result.data as Message,
        ];
      });
    } else {
      setError(result.error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/60 text-sm">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error && !conversationId) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-8">
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center max-w-2xl">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-base-content">How can I help you today?</h3>
              <p className="text-base-content/60 text-sm">
                Ask me anything about your class materials. I&apos;ll do my best to help you learn!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-xl mx-auto">
                <button
                  onClick={() => setInput("Can you summarize the main concepts?")}
                  className="p-4 text-left rounded-lg border border-base-content/20 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <p className="text-sm font-medium text-base-content">📚 Summarize concepts</p>
                  <p className="text-xs text-base-content/60 mt-1">Get an overview of the material</p>
                </button>
                <button
                  onClick={() => setInput("Explain this topic in simple terms")}
                  className="p-4 text-left rounded-lg border border-base-content/20 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <p className="text-sm font-medium text-base-content">💡 Explain simply</p>
                  <p className="text-xs text-base-content/60 mt-1">Break down complex ideas</p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-8 ${msg.role === 'user' ? 'flex justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-base-content/50 mb-2">AI Tutor</p>
                      <div className="prose prose-sm max-w-none text-base-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 p-3 rounded-lg bg-base-200/50 border border-base-content/10">
                          <p className="text-xs font-semibold text-base-content/70 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Sources:
                          </p>
                          <ul className="text-xs space-y-1.5">
                            {msg.sources.map((source, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-base-content/70">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                {source.fileName}
                                <span className="text-base-content/50">({Math.round(source.similarity * 100)}% relevant)</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-xs text-base-content/40 mt-2">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="flex gap-4 max-w-2xl">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-base-content/50 mb-2 text-right">You</p>
                      <div className="bg-primary text-primary-content rounded-2xl px-4 py-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                      </div>
                      <p className="text-xs text-base-content/40 mt-2 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="mb-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-base-content/50 mb-2">AI Tutor</p>
                    <div className="flex items-center gap-2 text-base-content/60">
                      <span className="loading loading-dots loading-sm"></span>
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-base-content/10 bg-base-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {error && (
            <div className="alert alert-error mb-4 text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSend} className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your class materials... (Shift+Enter for new line)"
              className="w-full px-4 py-3 pr-12 rounded-xl border border-base-content/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none bg-base-100 text-base-content placeholder:text-base-content/40 max-h-32"
              disabled={sending}
              maxLength={2000}
              rows={1}
            />
            <button
              type="submit"
              className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all ${
                !input.trim() || sending
                  ? 'bg-base-content/10 text-base-content/30 cursor-not-allowed'
                  : 'bg-primary text-primary-content hover:bg-primary/90'
              }`}
              disabled={!input.trim() || sending}
            >
              {sending ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </button>
          </form>
          <p className="text-xs text-base-content/40 mt-2 text-center">
            {input.length}/2000 • Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
