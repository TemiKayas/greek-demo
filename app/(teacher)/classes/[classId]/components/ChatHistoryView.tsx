'use client';

import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getClassChatHistory } from '@/app/actions/chatHistory';

interface ChatHistoryViewProps {
  classId: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
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
}

export function ChatHistoryView({ classId }: ChatHistoryViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const result = await getClassChatHistory(classId);
    if (result.success) {
      setConversations(result.data as Conversation[]);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    loadConversations();
  }, [classId, loadConversations]);

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/60 text-sm">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 px-4">
        <div className="text-center max-w-2xl">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold mb-3 text-base-content">No student conversations yet</h3>
          <p className="text-base-content/60 text-sm">
            When students start chatting with class materials, their conversations will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-base-content">Student Conversations</h3>
            <p className="text-xs text-base-content/60">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {conversations.map((conv) => {
          const isExpanded = expandedId === conv.id;
          const messageCount = conv.messages.length;
          const firstUserMessage = conv.messages.find((m) => m.role === 'user')?.content || '';
          const preview = firstUserMessage.substring(0, 120) + (firstUserMessage.length > 120 ? '...' : '');

          return (
            <div key={conv.id} className="bg-base-200 rounded-2xl shadow-sm border border-primary-content/10 overflow-hidden">
              {/* Summary View */}
              <div
                className="p-5 cursor-pointer hover:bg-base-300 transition-colors"
                onClick={() => toggleExpand(conv.id)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-primary-content">{conv.user.name}</span>
                          <span className="text-xs text-primary-content/60">({conv.user.email})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {messageCount} message{messageCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-primary-content/80 mb-3 line-clamp-2">{preview}</p>
                    <div className="flex items-center gap-4 text-xs text-primary-content/60">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Started {new Date(conv.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        Last active {new Date(conv.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button className="flex-shrink-0 p-2 rounded-lg hover:bg-primary/10 transition-colors">
                    <svg
                      className={`w-5 h-5 text-primary-content transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded View - Full Conversation */}
              {isExpanded && (
                <div className="border-t border-primary-content/10 bg-base-100">
                  <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                    {conv.messages.map((msg, idx) => (
                      <div key={idx} className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                        {msg.role === 'assistant' && (
                          <div className="flex gap-4 max-w-4xl">
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
                            </div>
                          </div>
                        )}
                        {msg.role === 'user' && (
                          <div className="flex gap-4 max-w-2xl">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-base-content/50 mb-2 text-right">{conv.user.name}</p>
                              <div className="bg-primary text-primary-content rounded-2xl px-4 py-3">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                              </div>
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
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
