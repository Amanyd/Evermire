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

export default function TimelinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
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
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'very_happy': return 'bg-green-500';
      case 'happy': return 'bg-green-400';
      case 'neutral': return 'bg-gray-400';
      case 'sad': return 'bg-yellow-500';
      case 'very_sad': return 'bg-red-500';
      default: return 'bg-gray-400';
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
            <p className="text-gray-500">Loading timeline...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Your Emotional Journey</h1>
        
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Timeline Available</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Create some posts to see your emotional journey over time. Each post will be added to your personal timeline!
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-purple-800">
                💡 <strong>Tip:</strong> Your timeline shows your emotional progression, helping you understand your mental health patterns.
              </p>
            </div>
          </div>
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
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${getMoodColor(post.overallMood)}`}>
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
                    
                    <p className="text-gray-800 mb-2 font-medium">&ldquo;{post.caption}&rdquo;</p>
                    
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
  );
} 