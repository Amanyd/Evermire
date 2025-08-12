'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import{Activity, Clapperboard, AudioWaveform, UtensilsCrossed} from 'lucide-react';

interface Post {
  _id: string;
  imageUrl: string;
  caption: string;
  detailedMoodDescription: string;
  moodDescription: string;
  mentalHealthTraits: {
    anxiety: number;
    down: number;
    stress: number;
    joy: number;
    energy: number;
    bold: number;
  };
  overallMood: string;
  createdAt: string;
}

interface AnalyticsData {
  totalPosts: number;
  averageScores: {
    anxiety: number;
    down: number;
    stress: number;
    joy: number;
    energy: number;
    bold: number;
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
    down: number[];
    stress: number[];
    joy: number[];
    energy: number[];
    bold: number[];
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
    return <div className="min-h-[100vh] flex items-center justify-center"><div className="spinner"></div></div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center bg-[#1d1c1a]">
        <Navigation />
        <div className="w-full mx-auto p-8">
          <div className="flex min-h-[100vh] justify-center items-center py-8">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex justify-center bg-[#1d1c1a]">
        <Navigation />
        <div className="w-full mx-auto h-[100vh] flex justify-center items-center my-auto p-8">
          <div className="flex-col text-center justify-center items-center py-12">
            
            <h3 className="text-[#a49c96] mb-2">Error Loading Analytics</h3>
            <p className="text-[#a49c96] ">
              {error}
            </p>
            <button
              onClick={fetchPosts}
              className="px-4 py-2 mt-4 bg-[#d98a7d] cursor-pointer text-[#f8f5f2] rounded-full "
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center bg-[#1d1c1a]">
      <Navigation />
      <div className="mt-18 mx-auto max-w-5xl w-full p-8">
        <h1 className="text-2xl text-[#eac6b8] font-bold mb-8">Pulse...</h1>

        {!analytics ? (
          <div className="text-center py-12">

            <h3 className="  text-[#a49c96] mb-2">No Analytics Available</h3>

          </div>
        ) : analytics.totalPosts === 0 ? (
          <div className="text-center py-12">

            <h3 className=" text-[#a49c96] mb-2">No Posts Yet</h3>

          </div>
        ) : (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#2a2826] rounded-3xl  p-6">
                <h3 className="text-lg font-semibold text-[#f8f5f2] mb-2">Total Posts</h3>
                <p className="text-3xl font-bold text-[#d98a7d]">{analytics.totalPosts}</p>
              </div>
              <div className="bg-[#2a2826] rounded-3xl  p-6">
                <h3 className="text-lg font-semibold text-[#f8f5f2] mb-2">Average Happiness</h3>
                <p className={`text-3xl text-[#d98a7d] font-bold `}>
                  {analytics.averageScores.joy}/10
                </p>
              </div>
              <div className="bg-[#2a2826] rounded-3xl  p-6">
                <h3 className="text-lg font-semibold text-[#f8f5f2] mb-2">Average Energy</h3>
                <p className={`text-3xl font-bold text-[#d98a7d]`}>
                  {analytics.averageScores.energy}/10
                </p>
              </div>
              <div className="bg-[#2a2826] rounded-3xl  p-6">
                <h3 className="text-lg font-semibold text-[#f8f5f2] mb-2">Average Confidence</h3>
                <p className={`text-3xl font-bold text-[#d98a7d]`}>
                  {analytics.averageScores.bold}/10
                </p>
              </div>
            </div>

            {/* Mental Health Scores */}
            <div className="bg-[#2a2826] rounded-3xl p-6">
              <h2 className="text-xl text-[#f8f5f2] font-semibold mb-4">Trait Averages</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(analytics.averageScores).map(([trait, score]) => (
                  <div key={trait} className="flex justify-between items-center p-3 bg-[#f3e2d9] rounded-full">
                    <span className="capitalize text-xs md:text-sm font-medium text-[#a49c96]">{trait}</span>
                    <span className={`font-bold text-[#d98a7d]`}>{score}/10</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI-Powered Suggestions */}
            <div className="bg-[#2a2826] rounded-3xl shadow p-6">
              <h2 className="text-xl text-[#f8f5f2] font-semibold mb-4">Personalized Suggestions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Recommended Activities */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-[#f8f5f2] flex items-center">
                    <span className="mr-2"><Activity/></span>
                    Activities
                  </h3>
                  <div className="space-y-2">
                    {analytics.suggestions?.activities?.map((activity, index) => (
                      <div key={index} className="bg-[#f3e2d9] p-3 rounded-3xl">
                        <p className="text-sm text-[#d98a7d] font-medium">{activity}</p>
                      </div>
                    )) || (
                        <div className="bg-[#f3e2d9] p-3 rounded-3xl">
                          <p className="text-sm text-[#d98a7d]">No suggestions available</p>
                        </div>
                      )}
                  </div>
                </div>

                {/* Recommended Movies */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-[#f8f5f2] flex items-center">
                    <span className="mr-2">
                      <Clapperboard/>
                    </span>
                    Movies
                  </h3>
                  <div className="space-y-2">
                    {analytics.suggestions?.movies?.map((movie, index) => (
                      <div key={index} className="bg-[#f3e2d9] p-3 rounded-3xl">
                        <p className="text-sm text-[#a49c96] font-medium">{movie}</p>
                      </div>
                    )) || (
                        <div className="bg-[#f3e2d9] p-3 rounded-3xl">
                          <p className="text-sm text-[#a49c96]">No suggestions available</p>
                        </div>
                      )}
                  </div>
                </div>

                {/* Recommended Songs */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-[#f8f5f2] flex items-center">
                    <span className="mr-2"><AudioWaveform/></span>
                    Songs
                  </h3>
                  <div className="space-y-2">
                    {analytics.suggestions?.songs?.map((song, index) => (
                      <div key={index} className="bg-[#f3e2d9] p-3 rounded-3xl">
                        <p className="text-sm text-[#d98a7d] font-medium">{song}</p>
                      </div>
                    )) || (
                        <div className="bg-[#f3e2d9] p-3 rounded-3xl">
                          <p className="text-sm text-[#d98a7d]">No suggestions available</p>
                        </div>
                      )}
                  </div>
                </div>

                {/* Recommended Food */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-[#f8f5f2] flex items-center">
                    <span className="mr-2"><UtensilsCrossed/></span>
                    Food
                  </h3>
                  <div className="space-y-2">
                    {analytics.suggestions?.food?.map((food, index) => (
                      <div key={index} className="bg-[#f3e2d9] p-3 rounded-3xl">
                        <p className="text-sm text-[#a49c96] font-medium">{food}</p>
                      </div>
                    )) || (
                        <div className="bg-[#f3e2d9] p-3 rounded-3xl">
                          <p className="text-sm text-[#a49c96]">No suggestions available</p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Trends */}
            <div className="bg-[#2a2826] rounded-3xl  p-6">
              <h2 className="text-xl text-[#f8f5f2] font-semibold mb-4">Recent Trends </h2>
              <div className="space-y-4">
                {Object.entries(analytics.recentTrends).map(([trait, scores]) => (
                  <div key={trait} className="flex items-center space-x-4">
                    <span className="capitalize font-medium text-[#f8f5f2] w-24">{trait}</span>
                    <div className="flex-1 flex space-x-1">
                      {scores.map((score, index) => (
                        <div
                          key={index}
                          className={`h-8 rounded-full flex-1 flex items-center justify-center text-xs font-medium bg-[#f3e2d9] text-[#d98a7d]`}
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