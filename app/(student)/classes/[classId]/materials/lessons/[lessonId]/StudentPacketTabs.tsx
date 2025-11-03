'use client';

import { useState, useEffect } from 'react';
import { getPublishedPacket } from '@/app/actions/packet';
import { PacketItemType } from '@prisma/client';

type PacketItem = {
  id: string;
  itemType: PacketItemType;
  itemId: string;
  order: number;
  editedContent: string | null;
  itemData: any;
};

type PacketTab = {
  id: string;
  type: PacketItemType;
  itemId: string;
  title: string;
};

type StudentPacketTabsProps = {
  lessonId: string;
  activeItemId: string | null;
  onTabChange: (itemId: string, type: PacketItemType) => void;
};

export default function StudentPacketTabs({ lessonId, activeItemId, onTabChange }: StudentPacketTabsProps) {
  const [items, setItems] = useState<PacketItem[]>([]);
  const [tabs, setTabs] = useState<PacketTab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPacket();
  }, [lessonId]);

  async function loadPacket() {
    setLoading(true);
    const result = await getPublishedPacket(lessonId);
    if (result.success && result.data) {
      const packet = result.data;
      setItems(packet.items || []);

      // Convert items to tabs
      const packetTabs = (packet.items || []).map((item: PacketItem) => ({
        id: item.itemId,
        type: item.itemType,
        itemId: item.itemId,
        title: getTabTitle(item.itemType, item.itemData),
      }));
      setTabs(packetTabs);

      // Auto-select first tab if available
      if (packetTabs.length > 0 && !activeItemId) {
        onTabChange(packetTabs[0].itemId, packetTabs[0].type);
      }
    }
    setLoading(false);
  }

  function getTabTitle(type: PacketItemType, itemData: any): string {
    if (!itemData) return 'Unknown';

    if (type === 'PDF') {
      return itemData.filename || 'PDF';
    } else if (type === 'FLASHCARD' || type === 'WORKSHEET') {
      return itemData.title || `${type}`;
    }
    return 'Item';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-base-200 border-b border-base-content/10">
        <span className="loading loading-spinner loading-sm"></span>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-base-200 border-b border-base-content/10">
        <div className="text-center text-base-content/60">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-lg font-medium">No Materials Available</p>
          <p className="text-sm mt-1">Your teacher hasn't published any materials for this lesson yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-b border-base-content/10 bg-base-200">
      {/* Header */}
      <div className="flex items-center px-4 py-2">
        <h3 className="text-sm font-semibold">Lesson Materials</h3>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabChange(tab.itemId, tab.type)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer transition-colors text-sm ${
              activeItemId === tab.id
                ? 'bg-base-100 text-primary border-t-2 border-primary'
                : 'bg-base-300/50 hover:bg-base-300'
            }`}
          >
            {/* Icon based on type */}
            {tab.type === 'PDF' && (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {tab.type === 'FLASHCARD' && (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )}
            {tab.type === 'WORKSHEET' && (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}

            <span className="truncate max-w-[120px]">{tab.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
