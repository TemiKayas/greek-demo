import { db } from '@/lib/db';

// Characters for invite codes (excluding ambiguous: 0, O, I, 1, l)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random 6-character invite code
 */
export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/**
 * Generate a unique invite code that doesn't exist in database
 * @param maxAttempts Maximum number of attempts to generate a unique code
 * @returns Unique invite code
 */
export async function generateUniqueInviteCode(maxAttempts = 10): Promise<string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const code = generateInviteCode();

    // Check if code already exists
    const existing = await db.inviteCode.findUnique({
      where: { code },
    });

    if (!existing) {
      return code;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique invite code after multiple attempts');
}

/**
 * Validate an invite code
 * @param code The invite code to validate
 * @returns Object with validation result and invite code data if valid
 */
export async function validateInviteCode(code: string) {
  const inviteCode = await db.inviteCode.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      class: true,
    },
  });

  if (!inviteCode) {
    return {
      valid: false,
      error: 'Invalid invite code',
    };
  }

  if (!inviteCode.isActive) {
    return {
      valid: false,
      error: 'This invite code has been deactivated',
    };
  }

  if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
    return {
      valid: false,
      error: 'This invite code has expired',
    };
  }

  return {
    valid: true,
    inviteCode,
  };
}
