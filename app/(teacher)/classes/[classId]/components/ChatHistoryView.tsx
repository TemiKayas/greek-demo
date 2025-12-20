'use client';

import { useEffect, useState, useCallback } from 'react';
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
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-500 mb-2">No student conversations yet</p>
        <p className="text-sm text-gray-400">
          When students start chatting with class materials, their conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Student Chat History ({conversations.length} conversation{conversations.length !== 1 ? 's' : ''})
        </h3>
      </div>

      <div className="space-y-3">
        {conversations.map((conv) => {
          const isExpanded = expandedId === conv.id;
          const messageCount = conv.messages.length;
          const firstUserMessage = conv.messages.find((m) => m.role === 'user')?.content || '';
          const preview = firstUserMessage.substring(0, 100) + (firstUserMessage.length > 100 ? '...' : '');

          return (
            <div key={conv.id} className="card bg-base-200 p-4">
              {/* Summary View */}
              <div
                className="cursor-pointer"
                onClick={() => toggleExpand(conv.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{conv.user.name}</span>
                      <span className="text-sm text-gray-500">({conv.user.email})</span>
                      <span className="badge badge-sm">{messageCount} messages</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{preview}</p>
                    <div className="text-xs text-gray-500">
                      Started: {new Date(conv.createdAt).toLocaleString()} •
                      Last active: {new Date(conv.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-ghost">
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {/* Expanded View - Full Conversation */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-base-300">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {conv.messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
                      >
                        <div className="chat-header text-xs opacity-70 mb-1">
                          {msg.role === 'user' ? conv.user.name : 'AI Tutor'}
                        </div>
                        <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                          {msg.content}
                        </div>
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
