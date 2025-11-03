'use server';

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { PacketItemType, PacketStatus } from '@prisma/client';

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// SECURITY HELPERS
// ============================================================================

/**
 * Verify that the user owns the packet (via lesson ownership)
 */
async function verifyPacketOwnership(packetId: string, userId: string): Promise<boolean> {
  const packet = await db.packet.findUnique({
    where: { id: packetId },
    include: {
      lesson: {
        select: { creatorId: true },
      },
    },
  });

  return packet?.lesson.creatorId === userId;
}

/**
 * Verify that the user owns the lesson
 */
async function verifyLessonOwnership(lessonId: string, userId: string): Promise<boolean> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { creatorId: true },
  });

  return lesson?.creatorId === userId;
}

/**
 * Verify student has access to lesson (via class membership)
 */
async function verifyStudentLessonAccess(lessonId: string, userId: string): Promise<boolean> {
  const lessonClass = await db.lessonClass.findFirst({
    where: {
      lessonId,
      class: {
        memberships: {
          some: {
            userId,
          },
        },
      },
    },
  });

  return !!lessonClass;
}

// ============================================================================
// PACKET CRUD OPERATIONS
// ============================================================================

/**
 * Get or create packet for a lesson
 */
export async function getOrCreatePacket(lessonId: string): Promise<ActionResult<{ packetId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify user owns the lesson
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: { creatorId: true },
    });

    if (!lesson) {
      return { success: false, error: 'Lesson not found' };
    }

    if (lesson.creatorId !== session.user.id) {
      return { success: false, error: 'Forbidden: You do not own this lesson' };
    }

    // Check if packet exists
    let packet = await db.packet.findUnique({
      where: { lessonId },
    });

    // Create if doesn't exist
    if (!packet) {
      packet = await db.packet.create({
        data: {
          lessonId,
          status: PacketStatus.DRAFT,
        },
      });
    }

    return { success: true, data: { packetId: packet.id } };
  } catch (error) {
    console.error('Error getting/creating packet:', error);
    return { success: false, error: 'Failed to get or create packet' };
  }
}

/**
 * Get packet with all items populated
 */
export async function getPacketWithItems(lessonId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify lesson ownership
    const hasAccess = await verifyLessonOwnership(lessonId, session.user.id);
    if (!hasAccess) {
      return { success: false, error: 'Forbidden: You do not own this lesson' };
    }

    const packet = await db.packet.findUnique({
      where: { lessonId },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
        openTabs: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!packet) {
      return { success: false, error: 'Packet not found' };
    }

    // Fetch actual item data (PDFs, Materials)
    const itemsWithData = await Promise.all(
      packet.items.map(async (item) => {
        let itemData = null;

        if (item.itemType === PacketItemType.PDF) {
          itemData = await db.pDF.findUnique({
            where: { id: item.itemId },
            include: { processedContent: true },
          });
        } else if (item.itemType === PacketItemType.FLASHCARD || item.itemType === PacketItemType.WORKSHEET) {
          itemData = await db.material.findUnique({
            where: { id: item.itemId },
          });
        }

        return {
          ...item,
          itemData,
        };
      })
    );

    // Fetch open tab data
    const openTabsWithData = await Promise.all(
      packet.openTabs.map(async (tab) => {
        let itemData = null;

        if (tab.itemType === PacketItemType.PDF) {
          itemData = await db.pDF.findUnique({
            where: { id: tab.itemId },
            include: { processedContent: true },
          });
        } else if (tab.itemType === PacketItemType.FLASHCARD || tab.itemType === PacketItemType.WORKSHEET) {
          itemData = await db.material.findUnique({
            where: { id: tab.itemId },
          });
        }

        return {
          ...tab,
          itemData,
        };
      })
    );

    return {
      success: true,
      data: {
        ...packet,
        items: itemsWithData,
        openTabs: openTabsWithData,
      },
    };
  } catch (error) {
    console.error('Error getting packet with items:', error);
    return { success: false, error: 'Failed to get packet' };
  }
}

// ============================================================================
// PACKET ITEM MANAGEMENT
// ============================================================================

/**
 * Add item to packet
 */
export async function addItemToPacket(
  packetId: string,
  itemType: PacketItemType,
  itemId: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify packet ownership
    const hasAccess = await verifyPacketOwnership(packetId, session.user.id);
    if (!hasAccess) {
      return { success: false, error: 'Forbidden: You do not own this packet' };
    }

    // Check if item already exists
    const existing = await db.packetItem.findFirst({
      where: {
        packetId,
        itemType,
        itemId,
      },
    });

    if (existing) {
      return { success: false, error: 'Item already in packet' };
    }

    // Get current max order
    const maxOrder = await db.packetItem.findFirst({
      where: { packetId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = (maxOrder?.order ?? -1) + 1;

    const item = await db.packetItem.create({
      data: {
        packetId,
        itemType,
        itemId,
        order: newOrder,
      },
    });

    return { success: true, data: item };
  } catch (error) {
    console.error('Error adding item to packet:', error);
    return { success: false, error: 'Failed to add item to packet' };
  }
}

/**
 * Remove item from packet
 */
export async function removeItemFromPacket(packetId: string, packetItemId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify packet ownership
    const hasAccess = await verifyPacketOwnership(packetId, session.user.id);
    if (!hasAccess) {
      return { success: false, error: 'Forbidden: You do not own this packet' };
    }

    await db.packetItem.delete({
      where: { id: packetItemId },
    });

    return { success: true, data: null };
  } catch (error) {
    console.error('Error removing item from packet:', error);
    return { success: false, error: 'Failed to remove item from packet' };
  }
}

/**
 * Reorder packet items
 */
export async function reorderPacketItems(
  packetId: string,
  itemOrders: { id: string; order: number }[]
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify packet ownership
    const hasAccess = await verifyPacketOwnership(packetId, session.user.id);
    if (!hasAccess) {
      return { success: false, error: 'Forbidden: You do not own this packet' };
    }

    // Update all items in a transaction
    await db.$transaction(
      itemOrders.map((item) =>
        db.packetItem.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    return { success: true, data: null };
  } catch (error) {
    console.error('Error reordering packet items:', error);
    return { success: false, error: 'Failed to reorder items' };
  }
}

/**
 * Update packet item edited content (for worksheets/flashcards)
 */
export async function updatePacketItemContent(
  packetItemId: string,
  editedContent: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify packet ownership via packet item
    const packetItem = await db.packetItem.findUnique({
      where: { id: packetItemId },
      select: { packetId: true },
    });

    if (!packetItem) {
      return { success: false, error: 'Packet item not found' };
    }

    const hasAccess = await verifyPacketOwnership(packetItem.packetId, session.user.id);
    if (!hasAccess) {
      return { success: false, error: 'Forbidden: You do not own this packet' };
    }

    const item = await db.packetItem.update({
      where: { id: packetItemId },
      data: { editedContent },
    });

    return { success: true, data: item };
  } catch (error) {
    console.error('Error updating packet item content:', error);
    return { success: false, error: 'Failed to update item content' };
  }
}

// ============================================================================
// OPEN TAB MANAGEMENT (UI State Persistence)
// ============================================================================

/**
 * Sync all open tabs at once (replaces all existing tabs)
 */
export async function syncOpenTabs(
  packetId: string,
  tabs: { itemType: PacketItemType; itemId: string; order: number }[]
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify packet ownership
    const hasAccess = await verifyPacketOwnership(packetId, session.user.id);
    if (!hasAccess) {
      return { success: false, error: 'Forbidden: You do not own this packet' };
    }

    // Delete all existing tabs and create new ones in a transaction
    await db.$transaction([
      db.packetOpenTab.deleteMany({
        where: { packetId },
      }),
      ...tabs.map((tab) =>
        db.packetOpenTab.create({
          data: {
            packetId,
            itemType: tab.itemType,
            itemId: tab.itemId,
            order: tab.order,
          },
        })
      ),
    ]);

    return { success: true, data: null };
  } catch (error) {
    console.error('Error syncing open tabs:', error);
    return { success: false, error: 'Failed to sync open tabs' };
  }
}

// ============================================================================
// PACKET PUBLISHING
// ============================================================================

/**
 * Publish packet (creates version snapshot)
 */
export async function publishPacket(packetId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify packet ownership
    const hasAccess = await verifyPacketOwnership(packetId, session.user.id);
    if (!hasAccess) {
      return { success: false, error: 'Forbidden: You do not own this packet' };
    }

    // Get packet with items
    const packet = await db.packet.findUnique({
      where: { id: packetId },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!packet) {
      return { success: false, error: 'Packet not found' };
    }

    // Get next version number
    const latestVersion = await db.packetVersion.findFirst({
      where: { packetId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    // Create snapshot
    const snapshot = {
      items: packet.items,
      publishedAt: new Date().toISOString(),
    };

    // Create version and update packet status in transaction
    await db.$transaction([
      db.packetVersion.create({
        data: {
          packetId,
          version: nextVersion,
          snapshot: JSON.stringify(snapshot),
          publishedBy: session.user.id,
        },
      }),
      db.packet.update({
        where: { id: packetId },
        data: {
          status: PacketStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      }),
    ]);

    return { success: true, data: { version: nextVersion } };
  } catch (error) {
    console.error('Error publishing packet:', error);
    return { success: false, error: 'Failed to publish packet' };
  }
}

/**
 * Unpublish packet
 */
export async function unpublishPacket(packetId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify packet ownership
    const hasAccess = await verifyPacketOwnership(packetId, session.user.id);
    if (!hasAccess) {
      return { success: false, error: 'Forbidden: You do not own this packet' };
    }

    await db.packet.update({
      where: { id: packetId },
      data: {
        status: PacketStatus.DRAFT,
        publishedAt: null,
      },
    });

    return { success: true, data: null };
  } catch (error) {
    console.error('Error unpublishing packet:', error);
    return { success: false, error: 'Failed to unpublish packet' };
  }
}

/**
 * Get packet version history
 */
export async function getPacketVersions(packetId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify packet ownership
    const hasAccess = await verifyPacketOwnership(packetId, session.user.id);
    if (!hasAccess) {
      return { success: false, error: 'Forbidden: You do not own this packet' };
    }

    const versions = await db.packetVersion.findMany({
      where: { packetId },
      orderBy: { version: 'desc' },
    });

    return { success: true, data: versions };
  } catch (error) {
    console.error('Error getting packet versions:', error);
    return { success: false, error: 'Failed to get packet versions' };
  }
}

// ============================================================================
// STUDENT ACCESS
// ============================================================================

/**
 * Get published packet for students
 */
export async function getPublishedPacket(lessonId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify student has access to lesson (via class membership)
    const hasAccess = await verifyStudentLessonAccess(lessonId, session.user.id);
    if (!hasAccess) {
      return { success: false, error: 'Forbidden: You do not have access to this lesson' };
    }

    const packet = await db.packet.findUnique({
      where: {
        lessonId,
        status: PacketStatus.PUBLISHED,
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!packet) {
      return { success: false, error: 'No published packet found' };
    }

    // Fetch actual item data
    const itemsWithData = await Promise.all(
      packet.items.map(async (item) => {
        let itemData = null;

        if (item.itemType === PacketItemType.PDF) {
          itemData = await db.pDF.findUnique({
            where: { id: item.itemId },
            include: { processedContent: true },
          });
        } else if (item.itemType === PacketItemType.FLASHCARD || item.itemType === PacketItemType.WORKSHEET) {
          itemData = await db.material.findUnique({
            where: { id: item.itemId },
          });
        }

        return {
          ...item,
          itemData,
        };
      })
    );

    return {
      success: true,
      data: {
        ...packet,
        items: itemsWithData,
      },
    };
  } catch (error) {
    console.error('Error getting published packet:', error);
    return { success: false, error: 'Failed to get published packet' };
  }
}
