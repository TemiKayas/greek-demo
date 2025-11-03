'use client';

import { useState, useEffect } from 'react';
import { getOrCreatePacket, getPacketWithItems, syncOpenTabs, publishPacket, unpublishPacket } from '@/app/actions/packet';
import { PacketItemType, PacketStatus } from '@prisma/client';

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

type PacketTabsProps = {
  lessonId: string;
  activeItemId: string | null;
  onTabChange: (itemId: string, type: PacketItemType) => void;
  triggerRefresh?: number; // Used to trigger refresh when new items added
};

export default function PacketTabs({ lessonId, activeItemId, onTabChange, triggerRefresh }: PacketTabsProps) {
  const [packetId, setPacketId] = useState<string | null>(null);
  const [status, setStatus] = useState<PacketStatus>('DRAFT');
  const [items, setItems] = useState<PacketItem[]>([]);
  const [tabs, setTabs] = useState<PacketTab[]>([]);

  useEffect(() => {
    loadPacket();
  }, [lessonId, triggerRefresh]);

  async function loadPacket() {
    const createResult = await getOrCreatePacket(lessonId);
    if (!createResult.success) {
      console.error('Failed to get packet:', createResult.error);
      return;
    }

    const { packetId: newPacketId } = createResult.data;
    setPacketId(newPacketId);

    const result = await getPacketWithItems(lessonId);
    if (result.success && result.data) {
      const packet = result.data;
      setStatus(packet.status);
      setItems(packet.items || []);

      // Convert items to tabs
      const packetTabs = (packet.items || []).map((item: PacketItem) => ({
        id: item.itemId,
        type: item.itemType,
        itemId: item.itemId,
        title: getTabTitle(item.itemType, item.itemData),
      }));
      setTabs(packetTabs);
    }
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

  function closeTab(tabId: string, e: React.MouseEvent) {
    e.stopPropagation();
    // TODO: Implement remove from packet
    console.log('Close tab:', tabId);
  }

  async function handlePublish() {
    if (!packetId) return;
    if (!confirm('Publish this packet? Students will be able to see it.')) return;

    const result = await publishPacket(packetId);
    if (result.success) {
      setStatus('PUBLISHED');
      alert('Packet published successfully!');
    } else {
      alert('Failed to publish packet: ' + result.error);
    }
  }

  async function handleUnpublish() {
    if (!packetId) return;
    if (!confirm('Unpublish this packet? Students will no longer see it.')) return;

    const result = await unpublishPacket(packetId);
    if (result.success) {
      setStatus('DRAFT');
      alert('Packet unpublished successfully!');
    } else {
      alert('Failed to unpublish packet: ' + result.error);
    }
  }

  return (
    <div className="flex flex-col border-b border-base-content/10">
      {/* Header with status and publish button */}
      <div className="flex items-center justify-between px-4 py-2 bg-base-200">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Digital Packet</h3>
          <span className={`badge badge-xs ${status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'}`}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'DRAFT' ? (
            <button onClick={handlePublish} className="btn btn-primary btn-xs">
              Publish
            </button>
          ) : (
            <button onClick={handleUnpublish} className="btn btn-ghost btn-xs">
              Unpublish
            </button>
          )}
        </div>
      </div>

      {/* VS Code-style tabs */}
      <div className="flex items-center gap-1 bg-base-200 px-2 py-1 overflow-x-auto">
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

            <button
              onClick={(e) => closeTab(tab.id, e)}
              className="ml-1 hover:bg-base-content/10 rounded p-0.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {tabs.length === 0 && (
          <div className="text-xs text-base-content/60 py-1 px-2">
            No items in packet - upload PDFs or generate materials to get started
          </div>
        )}
      </div>
    </div>
  );
}
