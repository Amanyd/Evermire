import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session: Session | null = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;

    await connectDB();
    
    // Find the post and verify it belongs to the user
    const post = await Post.findOne({ _id: postId, userId: session.user.id });
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Delete the post
    await Post.findByIdAndDelete(postId);

    // Clear cached suggestions since post context has changed
    console.log(`About to clear cache for user: ${session.user.id} after deleting post: ${postId}`);
    
    const updateResult = await User.findByIdAndUpdate(session.user.id, {
      $unset: {
        lastContextHash: 1,
        lastContextUpdatedAt: 1,
        cachedSuggestions: 1
      }
    });

    console.log(`Post deleted: ${postId}, cache clear result:`, updateResult ? 'SUCCESS' : 'FAILED');
    console.log(`Cleared cached suggestions for user: ${session.user.id}`);

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
