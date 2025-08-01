import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
