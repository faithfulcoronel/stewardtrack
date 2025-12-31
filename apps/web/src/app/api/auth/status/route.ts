import { NextResponse } from 'next/server';
import { getCachedUser } from '@/lib/auth/authCache';

export async function GET() {
  try {
    const { user } = await getCachedUser();

    return NextResponse.json({
      authenticated: !!user,
      userId: user?.id ?? null,
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    return NextResponse.json({
      authenticated: false,
      userId: null,
    });
  }
}
