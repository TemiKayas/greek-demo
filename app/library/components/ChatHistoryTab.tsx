'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getChatHistory, deleteChatConversation } from '@/app/actions/chatHistory';

type Props = {
  pdfId: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Conversation = {
  id: string;
  pdfId: string;
  messages: Message[];
  firstPrompt: string;
  createdAt: Date;
  updatedAt: Date;
};

export default function ChatHistoryTab({ pdfId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfId]);

  async function loadHistory() {
    setIsLoading(true);
    const result = await getChatHistory(pdfId);
    if (result.success && result.data) {
      setConversations(result.data);
    }
    setIsLoading(false);
  }

  async function handleDelete(conversationId: string) {
    if (!confirm('Delete this conversation?')) return;

    const result = await deleteChatConversation(conversationId);
    if (result.success) {
      // If viewing deleted conversation, clear it
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      await loadHistory();
    } else {
      alert('Failed to delete conversation: ' + result.error);
    }
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (selectedConversation) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-base-300 p-3 sm:p-4 bg-base-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-medium text-base-content truncate mb-1">
                {selectedConversation.firstPrompt}
              </h3>
              <p className="text-xs text-base-content/60">
                {formatDate(selectedConversation.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(selectedConversation.id)}
                className="btn btn-xs sm:btn-sm btn-error btn-outline"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedConversation(null)}
                className="btn btn-xs sm:btn-sm btn-ghost"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Conversation Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 bg-base-100">
          {selectedConversation.messages.map((msg, idx) => (
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
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 bg-base-100">
      {conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-base-content mb-3">Chat History</h3>
            <p className="text-sm sm:text-base text-base-content/60">
              No chat conversations yet. Start chatting in the CHAT tab to save your conversations here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="card bg-base-200 border border-base-content/10 hover:bg-base-300 transition-colors cursor-pointer"
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="card-body p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm sm:text-base text-base-content line-clamp-2 mb-2">
                        {conversation.firstPrompt}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-base-content/60">
                        <span>{formatDate(conversation.createdAt)}</span>
                        <span>•</span>
                        <span>{conversation.messages.length} messages</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conversation.id);
                      }}
                      className="btn btn-ghost btn-xs text-error hover:bg-error/20"
                      title="Delete conversation"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
