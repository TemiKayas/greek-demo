'use server';

import { db } from '@/lib/db';
import { signIn } from '@/lib/auth';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { AuthError } from 'next-auth';

// Validation schemas
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['TEACHER', 'STUDENT']),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function signup(
  formData: FormData
): Promise<ActionResult<{ message: string }>> {
  try {
    // Extract and validate data
    const rawData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
    };

    const validatedData = signupSchema.parse(rawData);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'A user with this email already exists',
      };
    }

    // Hash password
    const passwordHash = await hash(validatedData.password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
        role: validatedData.role,
      },
    });

    // Create role-specific profile
    if (validatedData.role === 'TEACHER') {
      await db.teacher.create({
        data: {
          userId: user.id,
        },
      });
    } else if (validatedData.role === 'STUDENT') {
      await db.student.create({
        data: {
          userId: user.id,
        },
      });
    }

    // Auto sign in after signup
    try {
      await signIn('credentials', {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      });
    } catch (error) {
      // If auto-signin fails, it's okay - user can manually login
      console.error('Auto-signin failed:', error);
    }

    return {
      success: true,
      data: { message: 'Account created successfully' },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }

    console.error('Signup error:', error);
    return {
      success: false,
      error: 'Failed to create account. Please try again.',
    };
  }
}

export async function login(
  formData: FormData
): Promise<ActionResult<{ message: string }>> {
  try {
    // Extract and validate data
    const rawData = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    const validatedData = loginSchema.parse(rawData);

    // Attempt sign in
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirectTo: '/', // Will be intercepted by middleware
    });

    return {
      success: true,
      data: { message: 'Logged in successfully' },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }

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
            error: 'Authentication failed. Please try again.',
          };
      }
    }

    // NextAuth throws NEXT_REDIRECT on success, so we need to re-throw it
    throw error;
  }
}
