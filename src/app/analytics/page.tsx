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
  suggestions?: {
    activities: string[];
    movies: string[];
    songs: string[];
    food: string[];
  };
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        console.log('fetchPosts: Analytics API response data:', data);
        setPosts(data.posts || []);
        setAnalytics(data);
      } else {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto p-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              {error}
            </p>
            <button
              onClick={fetchPosts}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Try Again
            </button>
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
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Available</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Create your first post to start tracking your mental health journey and see personalized analytics!
            </p>
          </div>
        ) : analytics.totalPosts === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Posts Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Start by creating your first post to see your mental health analytics and get personalized suggestions!
            </p>
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

            {/* AI-Powered Suggestions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Personalized Suggestions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Recommended Activities */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <span className="mr-2">🎯</span>
                    Activities
                  </h3>
                  <div className="space-y-2">
                    {analytics.suggestions?.activities?.map((activity, index) => (
                      <div key={index} className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium">{activity}</p>
                      </div>
                    )) || (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">No suggestions available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommended Movies */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <span className="mr-2">🎬</span>
                    Movies
                  </h3>
                  <div className="space-y-2">
                    {analytics.suggestions?.movies?.map((movie, index) => (
                      <div key={index} className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm text-purple-800 font-medium">{movie}</p>
                      </div>
                    )) || (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">No suggestions available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommended Songs */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <span className="mr-2">🎵</span>
                    Songs
                  </h3>
                  <div className="space-y-2">
                    {analytics.suggestions?.songs?.map((song, index) => (
                      <div key={index} className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">{song}</p>
                      </div>
                    )) || (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">No suggestions available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommended Food */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <span className="mr-2">🍽️</span>
                    Food
                  </h3>
                  <div className="space-y-2">
                    {analytics.suggestions?.food?.map((food, index) => (
                      <div key={index} className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-sm text-orange-800 font-medium">{food}</p>
                      </div>
                    )) || (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">No suggestions available</p>
                      </div>
                    )}
                  </div>
                </div>
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



          </div>
        )}
      </div>
    </div>
  );
} 