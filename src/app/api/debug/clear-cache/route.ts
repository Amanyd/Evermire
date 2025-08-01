import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session: Session | null = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Clear all cached suggestions for the user
    const result = await User.findByIdAndUpdate(session.user.id, {
      $unset: {
        lastContextHash: 1,
        lastContextUpdatedAt: 1,
        cachedSuggestions: 1
      }
    });

    console.log(`DEBUG: Manually cleared cache for user: ${session.user.id}`);
    console.log(`DEBUG: Cache clear result:`, result ? 'SUCCESS' : 'FAILED');

    return NextResponse.json({ 
      message: 'Cache cleared successfully',
      userId: session.user.id,
      success: !!result
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
