'use client';

import { useState, useEffect } from 'react';
import { getLessonChatHistory } from '@/app/actions/chatHistory';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatConversation = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  messages: Message[];
};

type Props = {
  classId: string;
  lessonId: string;
};

export default function StudentChatsTab({ classId, lessonId }: Props) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [classId, lessonId]);

  async function loadConversations() {
    setLoading(true);
    setError(null);
    const result = await getLessonChatHistory(classId, lessonId);

    if (result.success) {
      setConversations(result.data as any);
      if (result.data.length > 0) {
        setSelectedConversation(result.data[0] as any);
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="alert alert-error max-w-md">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-base-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p className="text-xl text-base-content/60 mb-2">No Student Chats Yet</p>
          <p className="text-sm text-base-content/40">
            Student conversations about this lesson will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversation List */}
      <div className="w-80 border-r border-base-content/10 overflow-y-auto bg-base-200">
        <div className="p-4 border-b border-base-content/10">
          <h3 className="font-bold text-lg">Student Conversations</h3>
          <p className="text-xs text-base-content/60 mt-1">{conversations.length} total</p>
        </div>

        <div className="divide-y divide-base-content/10">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`w-full text-left p-4 hover:bg-base-300 transition-colors ${
                selectedConversation?.id === conv.id ? 'bg-base-300' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-semibold text-sm">{conv.user.name}</span>
                <span className="text-xs text-base-content/40">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-base-content/60 truncate">{conv.user.email}</p>
              <p className="text-sm text-base-content/80 mt-2 line-clamp-2">{conv.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-sm">{conv.messages.length} messages</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-base-content/10 bg-base-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{selectedConversation.user.name}</h3>
                  <p className="text-sm text-base-content/60">{selectedConversation.user.email}</p>
                  <p className="text-xs text-base-content/40 mt-1">
                    Started {new Date(selectedConversation.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-base-100">
              {selectedConversation.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-content'
                        : 'bg-base-200 text-base-content'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-70">
                      {msg.role === 'user' ? 'Student' : 'AI Tutor'}
                    </div>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                            em: ({ children }) => <em className="text-primary">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
                            code: ({ children }) => <code className="bg-base-300 px-1.5 py-0.5 rounded text-sm text-primary">{children}</code>,
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
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-base-content/60">Select a conversation to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
