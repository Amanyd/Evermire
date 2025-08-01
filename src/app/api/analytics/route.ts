import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const posts = await Post.find({ userId: session.user.id }).sort({ createdAt: -1 });

    if (posts.length === 0) {
      return NextResponse.json({ 
        totalPosts: 0,
        averageScores: null,
        moodDistribution: null,
        recentTrends: null,
        topMoodDescriptions: []
      });
    }

    // Calculate average scores
    const totalScores = posts.reduce((acc, post) => ({
      anxiety: acc.anxiety + post.mentalHealthTraits.anxiety,
      depression: acc.depression + post.mentalHealthTraits.depression,
      stress: acc.stress + post.mentalHealthTraits.stress,
      happiness: acc.happiness + post.mentalHealthTraits.happiness,
      energy: acc.energy + post.mentalHealthTraits.energy,
      confidence: acc.confidence + post.mentalHealthTraits.confidence,
    }), { anxiety: 0, depression: 0, stress: 0, happiness: 0, energy: 0, confidence: 0 });

    const averageScores = {
      anxiety: Math.round((totalScores.anxiety / posts.length) * 10) / 10,
      depression: Math.round((totalScores.depression / posts.length) * 10) / 10,
      stress: Math.round((totalScores.stress / posts.length) * 10) / 10,
      happiness: Math.round((totalScores.happiness / posts.length) * 10) / 10,
      energy: Math.round((totalScores.energy / posts.length) * 10) / 10,
      confidence: Math.round((totalScores.confidence / posts.length) * 10) / 10,
    };

    // Calculate mood distribution
    const moodCounts = posts.reduce((acc, post) => {
      acc[post.overallMood] = (acc[post.overallMood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const moodDistribution = {
      very_happy: moodCounts.very_happy || 0,
      happy: moodCounts.happy || 0,
      neutral: moodCounts.neutral || 0,
      sad: moodCounts.sad || 0,
      very_sad: moodCounts.very_sad || 0,
    };

    // Get recent trends (last 10 posts)
    const recentPosts = posts.slice(0, 10).reverse();
    const recentTrends = {
      anxiety: recentPosts.map(post => post.mentalHealthTraits.anxiety),
      depression: recentPosts.map(post => post.mentalHealthTraits.depression),
      stress: recentPosts.map(post => post.mentalHealthTraits.stress),
      happiness: recentPosts.map(post => post.mentalHealthTraits.happiness),
      energy: recentPosts.map(post => post.mentalHealthTraits.energy),
      confidence: recentPosts.map(post => post.mentalHealthTraits.confidence),
    };

    // Get top mood descriptions (unique ones)
    const uniqueDescriptions = [...new Set(posts.map(post => post.detailedMoodDescription))];
    const topMoodDescriptions = uniqueDescriptions.slice(0, 5);

    return NextResponse.json({
      totalPosts: posts.length,
      averageScores,
      moodDistribution,
      recentTrends,
      topMoodDescriptions,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 