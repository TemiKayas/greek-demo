'use server';

import { getOrCreatePacket, addItemToPacket, getPacketWithItems } from './packet';
import { PacketItemType } from '@prisma/client';

/**
 * Auto-add an item to the packet if it doesn't already exist
 */
export async function autoAddToPacket(
  lessonId: string,
  itemType: PacketItemType,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[autoAddToPacket] Starting with:', { lessonId, itemType, itemId });

    // Get or create packet
    const packetResult = await getOrCreatePacket(lessonId);
    if (!packetResult.success) {
      console.error('[autoAddToPacket] Failed to get/create packet:', packetResult.error);
      return { success: false, error: packetResult.error };
    }

    const { packetId } = packetResult.data;
    console.log('[autoAddToPacket] Got packetId:', packetId);

    // Check if item already exists in packet
    const packetWithItems = await getPacketWithItems(lessonId);
    if (packetWithItems.success && packetWithItems.data) {
      const existingItem = packetWithItems.data.items.find(
        (item: any) => item.itemId === itemId && item.itemType === itemType
      );

      if (existingItem) {
        console.log('[autoAddToPacket] Item already in packet, skipping');
        return { success: true };
      }
    }

    // Add item to packet
    console.log('[autoAddToPacket] Adding item to packet...');
    const addResult = await addItemToPacket(packetId, itemType, itemId);
    console.log('[autoAddToPacket] Result:', addResult);
    return addResult;
  } catch (error) {
    console.error('[autoAddToPacket] Error:', error);
    return { success: false, error: 'Failed to add item to packet' };
  }
}
