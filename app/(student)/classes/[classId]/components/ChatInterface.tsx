'use client';

import { useEffect, useState, useRef } from 'react';
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

  useEffect(() => {
    initializeChat();
  }, [classId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function initializeChat() {
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
      setMessages(messagesResult.data);
    }

    setLoading(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !conversationId || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);
    setError(null);

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

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error && !conversationId) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
            <p className="text-base-content/70">
              Ask me anything about the class materials!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
              >
                <div className="chat-header text-xs opacity-70 mb-1">
                  {msg.role === 'user' ? 'You' : 'AI Tutor'}
                </div>
                <div
                  className={`chat-bubble ${
                    msg.role === 'user'
                      ? 'chat-bubble-primary'
                      : 'chat-bubble-secondary'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-base-300/50">
                      <p className="text-xs font-semibold mb-1 opacity-70">
                        Sources:
                      </p>
                      <ul className="text-xs space-y-1 opacity-70">
                        {msg.sources.map((source, idx) => (
                          <li key={idx}>
                            📄 {source.fileName} ({Math.round(source.similarity * 100)}% match)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="chat-footer text-xs opacity-50 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {sending && (
              <div className="chat chat-start">
                <div className="chat-header text-xs opacity-70 mb-1">
                  AI Tutor
                </div>
                <div className="chat-bubble chat-bubble-secondary">
                  <span className="loading loading-dots loading-sm"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-base-300 p-4 bg-base-100">
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the class materials..."
            className="input input-bordered flex-1"
            disabled={sending}
            maxLength={2000}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              'Send'
            )}
          </button>
        </form>
        <p className="text-xs text-base-content/60 mt-2">
          {input.length}/2000 characters
        </p>
      </div>
    </div>
  );
}
