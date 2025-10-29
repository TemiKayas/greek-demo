'use server';

import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';
import type { UserRole } from '@prisma/client';

// Validation schemas
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['TEACHER', 'STUDENT'], {
    message: 'Please select a role',
  }),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Types for server action returns
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Sign up a new user
 */
export async function signup(formData: FormData): Promise<ActionResult<{ userId: string }>> {
  try {
    // Parse and validate form data
    const rawData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
    };

    const validatedData = signupSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || 'Invalid form data',
      };
    }

    const { name, email, password, role } = validatedData.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'An account with this email already exists',
      };
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role as UserRole,
      },
    });

    return {
      success: true,
      data: { userId: user.id },
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      error: 'An error occurred during signup. Please try again.',
    };
  }
}

/**
 * Log in a user
 */
export async function login(formData: FormData): Promise<ActionResult> {
  try {
    // Parse and validate form data
    const rawData = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    const validatedData = loginSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || 'Invalid form data',
      };
    }

    const { email, password } = validatedData.data;

    // Attempt to sign in
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Login error:', error);

    // Handle NextAuth errors
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return {
            success: false,
            error: 'Invalid email or password',
          };
        default:
          return {
            success: false,
            error: 'An error occurred during login',
          };
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Get the current user session
 */
export async function getCurrentUser() {
  const { auth: getSession } = await import('@/lib/auth');
  const session = await getSession();
  return session?.user || null;
}
