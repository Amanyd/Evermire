'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface Post {
  _id: string;
  imageUrl: string;
  caption: string;
  detailedMoodDescription: string;
  moodDescription: string;
  mentalHealthTraits: {
    anxiety: number;
    depression: number;
    stress: number;
    happiness: number;
    energy: number;
    confidence: number;
  };
  overallMood: string;
  createdAt: string;
}

interface AnalyticsData {
  totalPosts: number;
  averageScores: {
    anxiety: number;
    depression: number;
    stress: number;
    happiness: number;
    energy: number;
    confidence: number;
  };
  moodDistribution: {
    very_happy: number;
    happy: number;
    neutral: number;
    sad: number;
    very_sad: number;
  };
  recentTrends: {
    anxiety: number[];
    depression: number[];
    stress: number[];
    happiness: number[];
    energy: number[];
    confidence: number[];
  };
  topMoodDescriptions: string[];
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPosts();
    }
  }, [status, router]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data || []);
        calculateAnalytics(data || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (postsData: Post[]) => {
    if (postsData.length === 0) {
      setAnalytics(null);
      return;
    }

    // Calculate average scores
    const totalScores = postsData.reduce((acc, post) => ({
      anxiety: acc.anxiety + post.mentalHealthTraits.anxiety,
      depression: acc.depression + post.mentalHealthTraits.depression,
      stress: acc.stress + post.mentalHealthTraits.stress,
      happiness: acc.happiness + post.mentalHealthTraits.happiness,
      energy: acc.energy + post.mentalHealthTraits.energy,
      confidence: acc.confidence + post.mentalHealthTraits.confidence,
    }), { anxiety: 0, depression: 0, stress: 0, happiness: 0, energy: 0, confidence: 0 });

    const averageScores = {
      anxiety: Math.round((totalScores.anxiety / postsData.length) * 10) / 10,
      depression: Math.round((totalScores.depression / postsData.length) * 10) / 10,
      stress: Math.round((totalScores.stress / postsData.length) * 10) / 10,
      happiness: Math.round((totalScores.happiness / postsData.length) * 10) / 10,
      energy: Math.round((totalScores.energy / postsData.length) * 10) / 10,
      confidence: Math.round((totalScores.confidence / postsData.length) * 10) / 10,
    };

    // Calculate mood distribution
    const moodCounts = postsData.reduce((acc, post) => {
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
    const recentPosts = postsData.slice(0, 10).reverse();
    const recentTrends = {
      anxiety: recentPosts.map(post => post.mentalHealthTraits.anxiety),
      depression: recentPosts.map(post => post.mentalHealthTraits.depression),
      stress: recentPosts.map(post => post.mentalHealthTraits.stress),
      happiness: recentPosts.map(post => post.mentalHealthTraits.happiness),
      energy: recentPosts.map(post => post.mentalHealthTraits.energy),
      confidence: recentPosts.map(post => post.mentalHealthTraits.confidence),
    };

    // Get top mood descriptions (unique ones)
    const uniqueDescriptions = [...new Set(postsData.map(post => post.detailedMoodDescription))];
    const topMoodDescriptions = uniqueDescriptions.slice(0, 5);

    setAnalytics({
      totalPosts: postsData.length,
      averageScores,
      moodDistribution,
      recentTrends,
      topMoodDescriptions,
    });
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'very_happy': return 'text-green-600 bg-green-100';
      case 'happy': return 'text-green-500 bg-green-50';
      case 'neutral': return 'text-gray-600 bg-gray-100';
      case 'sad': return 'text-yellow-600 bg-yellow-100';
      case 'very_sad': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto p-8">
          <div className="text-center py-8">
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Mental Health Analytics</h1>
        
        {!analytics ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No posts yet. Create some posts to see your analytics!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Posts</h3>
                <p className="text-3xl font-bold text-indigo-600">{analytics.totalPosts}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Average Happiness</h3>
                <p className={`text-3xl font-bold ${getScoreColor(analytics.averageScores.happiness)}`}>
                  {analytics.averageScores.happiness}/10
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Average Energy</h3>
                <p className={`text-3xl font-bold ${getScoreColor(analytics.averageScores.energy)}`}>
                  {analytics.averageScores.energy}/10
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Average Confidence</h3>
                <p className={`text-3xl font-bold ${getScoreColor(analytics.averageScores.confidence)}`}>
                  {analytics.averageScores.confidence}/10
                </p>
              </div>
            </div>

            {/* Mental Health Scores */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Mental Health Trait Averages</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(analytics.averageScores).map(([trait, score]) => (
                  <div key={trait} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="capitalize font-medium text-gray-700">{trait}</span>
                    <span className={`font-bold ${getScoreColor(score)}`}>{score}/10</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mood Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Mood Distribution</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(analytics.moodDistribution).map(([mood, count]) => (
                  <div key={mood} className="text-center p-4 rounded-lg">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getMoodColor(mood)}`}>
                      {mood.replace('_', ' ').toUpperCase()}
                    </div>
                    <p className="text-2xl font-bold mt-2">{count}</p>
                    <p className="text-sm text-gray-500">
                      {Math.round((count / analytics.totalPosts) * 100)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Trends */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Trends (Last 10 Posts)</h2>
              <div className="space-y-4">
                {Object.entries(analytics.recentTrends).map(([trait, scores]) => (
                  <div key={trait} className="flex items-center space-x-4">
                    <span className="capitalize font-medium text-gray-700 w-24">{trait}</span>
                    <div className="flex-1 flex space-x-1">
                      {scores.map((score, index) => (
                        <div
                          key={index}
                          className={`h-8 rounded flex-1 flex items-center justify-center text-xs font-medium ${
                            score >= 7 ? 'bg-green-500 text-white' :
                            score >= 4 ? 'bg-yellow-500 text-white' :
                            'bg-red-500 text-white'
                          }`}
                          title={`${trait}: ${score}/10`}
                        >
                          {score}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emotional Journey Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Your Emotional Journey</h2>
              {posts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No posts yet to show your journey.</p>
              ) : (
                <div className="space-y-6">
                  {posts.map((post, index) => (
                    <div key={post._id} className="relative">
                      {/* Timeline line */}
                      {index < posts.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-300"></div>
                      )}
                      
                      <div className="flex items-start space-x-4">
                        {/* Timeline dot */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          post.overallMood === 'very_happy' ? 'bg-green-500' :
                          post.overallMood === 'happy' ? 'bg-green-400' :
                          post.overallMood === 'neutral' ? 'bg-gray-400' :
                          post.overallMood === 'sad' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              post.overallMood === 'very_happy' ? 'bg-green-100 text-green-800' :
                              post.overallMood === 'happy' ? 'bg-green-50 text-green-700' :
                              post.overallMood === 'neutral' ? 'bg-gray-100 text-gray-700' :
                              post.overallMood === 'sad' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {post.overallMood.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          
                          <p className="text-gray-800 mb-2 font-medium">"{post.caption}"</p>
                          
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-700 text-sm">{post.detailedMoodDescription}</p>
                          </div>
                          
                          {/* Quick scores */}
                          <div className="flex space-x-4 mt-3 text-xs">
                            <span className={`${getScoreColor(post.mentalHealthTraits.happiness)}`}>
                              Happiness: {post.mentalHealthTraits.happiness}/10
                            </span>
                            <span className={`${getScoreColor(post.mentalHealthTraits.energy)}`}>
                              Energy: {post.mentalHealthTraits.energy}/10
                            </span>
                            <span className={`${getScoreColor(post.mentalHealthTraits.confidence)}`}>
                              Confidence: {post.mentalHealthTraits.confidence}/10
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 