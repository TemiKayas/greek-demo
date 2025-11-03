'use client';

import { useState, useEffect } from 'react';
import { getOrCreatePacket, getPacketWithItems, addItemToPacket, removeItemFromPacket, syncOpenTabs, publishPacket, unpublishPacket } from '@/app/actions/packet';
import { getLessonPDFs } from '@/app/actions/pdf';
import { PacketItemType, PacketStatus } from '@prisma/client';

type PacketItem = {
  id: string;
  itemType: PacketItemType;
  itemId: string;
  order: number;
  editedContent: string | null;
  itemData: any; // PDF, Material, etc.
};

type OpenTab = {
  id: string; // packetItemId
  type: PacketItemType;
  itemId: string;
  title: string;
};

type PacketTabProps = {
  lessonId: string;
};

export default function PacketTab({ lessonId }: PacketTabProps) {
  const [packetId, setPacketId] = useState<string | null>(null);
  const [status, setStatus] = useState<PacketStatus>('DRAFT');
  const [items, setItems] = useState<PacketItem[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    loadPacket();
  }, [lessonId]);

  async function loadPacket() {
    setIsLoading(true);

    // Get or create packet
    const createResult = await getOrCreatePacket(lessonId);
    if (!createResult.success) {
      console.error('Failed to get packet:', createResult.error);
      setIsLoading(false);
      return;
    }

    const { packetId: newPacketId } = createResult.data;
    setPacketId(newPacketId);

    // Load packet with items
    const result = await getPacketWithItems(lessonId);
    if (result.success && result.data) {
      const packet = result.data;
      setStatus(packet.status);
      setItems(packet.items || []);

      // Restore open tabs or open first item
      if (packet.openTabs && packet.openTabs.length > 0) {
        const tabs = packet.openTabs.map((tab: any) => ({
          id: tab.itemId, // Use itemId as tab identifier
          type: tab.itemType,
          itemId: tab.itemId,
          title: getTabTitle(tab.itemType, tab.itemData),
        }));
        setOpenTabs(tabs);
        setActiveTabId(tabs[0].id);
      } else if (packet.items && packet.items.length > 0) {
        // No open tabs, open first item by default
        const firstItem = packet.items[0];
        const tab = {
          id: firstItem.itemId,
          type: firstItem.itemType,
          itemId: firstItem.itemId,
          title: getTabTitle(firstItem.itemType, firstItem.itemData),
        };
        setOpenTabs([tab]);
        setActiveTabId(tab.id);
      }
    }

    setIsLoading(false);
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

  function openTab(item: PacketItem) {
    const existingTab = openTabs.find(tab => tab.id === item.itemId);

    if (existingTab) {
      // Tab already open, just switch to it
      setActiveTabId(existingTab.id);
    } else {
      // Open new tab
      const newTab: OpenTab = {
        id: item.itemId,
        type: item.itemType,
        itemId: item.itemId,
        title: getTabTitle(item.itemType, item.itemData),
      };
      setOpenTabs([...openTabs, newTab]);
      setActiveTabId(newTab.id);
    }
  }

  function closeTab(tabId: string, e: React.MouseEvent) {
    e.stopPropagation();

    const tabIndex = openTabs.findIndex(tab => tab.id === tabId);
    const newTabs = openTabs.filter(tab => tab.id !== tabId);
    setOpenTabs(newTabs);

    // If closing active tab, switch to adjacent tab
    if (activeTabId === tabId && newTabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
    } else if (newTabs.length === 0) {
      setActiveTabId(null);
    }

    // Persist tabs
    if (packetId) {
      syncOpenTabs(
        packetId,
        newTabs.map((tab, index) => ({
          itemType: tab.type,
          itemId: tab.itemId,
          order: index,
        }))
      );
    }
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

  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const activeItem = items.find(item => item.itemId === activeTabId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Header with Publish/Unpublish Button */}
      <div className="flex items-center justify-between p-4 border-b border-base-content/10">
        <h2 className="text-lg font-semibold">Digital Packet</h2>
        <div className="flex items-center gap-2">
          <span className={`badge ${status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'}`}>
            {status}
          </span>
          {status === 'DRAFT' ? (
            <button onClick={handlePublish} className="btn btn-primary btn-sm">
              Publish
            </button>
          ) : (
            <button onClick={handleUnpublish} className="btn btn-ghost btn-sm">
              Unpublish
            </button>
          )}
        </div>
      </div>

      {/* VS Code-style Tab Bar */}
      <div className="flex items-center gap-1 bg-base-200 px-2 py-1 border-b border-base-content/10 overflow-x-auto">
        {openTabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer transition-colors ${
              activeTabId === tab.id
                ? 'bg-base-100 text-primary'
                : 'bg-base-300/50 hover:bg-base-300'
            }`}
          >
            {/* Icon based on type */}
            {tab.type === 'PDF' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {tab.type === 'FLASHCARD' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )}
            {tab.type === 'WORKSHEET' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}

            <span className="text-sm truncate max-w-[150px]">{tab.title}</span>

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

        {/* Add Item Button */}
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="btn btn-ghost btn-xs ml-2"
          title="Add item to packet"
        >
          +
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab && activeItem ? (
          <div>
            <h3 className="text-xl font-semibold mb-4">{activeTab.title}</h3>

            {/* Render content based on type */}
            {activeTab.type === 'PDF' && (
              <div>
                <p className="text-sm text-base-content/60 mb-2">PDF Preview</p>
                {/* TODO: Embed PDF viewer or link to full view */}
                <p>PDF: {activeItem.itemData?.filename}</p>
              </div>
            )}

            {activeTab.type === 'WORKSHEET' && (
              <div>
                <p className="text-sm text-base-content/60 mb-2">Worksheet (Inline editing coming soon)</p>
                {/* TODO: Implement inline worksheet editing */}
                <pre className="text-sm bg-base-200 p-4 rounded">
                  {activeItem.editedContent || activeItem.itemData?.content || 'No content'}
                </pre>
              </div>
            )}

            {activeTab.type === 'FLASHCARD' && (
              <div>
                <p className="text-sm text-base-content/60 mb-2">Flashcards (Inline editing coming soon)</p>
                {/* TODO: Implement inline flashcard editing */}
                <pre className="text-sm bg-base-200 p-4 rounded">
                  {activeItem.editedContent || activeItem.itemData?.content || 'No content'}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-base-content/60">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No items in packet yet</p>
              <p className="text-sm mt-2">Click the + button to add items</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Menu (Simple for now, will improve later) */}
      {showAddMenu && (
        <div className="absolute top-32 left-64 bg-base-200 rounded-lg shadow-xl p-4 z-10">
          <p className="text-sm font-semibold mb-2">Add items to packet</p>
          <p className="text-xs text-base-content/60">Coming soon: Add PDFs, worksheets, and flashcards</p>
          <button onClick={() => setShowAddMenu(false)} className="btn btn-sm btn-ghost mt-2">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
