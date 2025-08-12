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
    joy: number;
    energy: number;
    bold: number;
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
    return <div className="min-h-screen flex items-center justify-center"><div className="spinner"></div></div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center bg-[#1d1c1a]">
        <Navigation />
        <div className=" w-[100vw] h-[100vh] flex justify-center items-center mx-auto p-8">
          <div className="text-center py-8">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1d1c1a] flex justify-center">
      <Navigation />
      <div className="max-w-5xl w-full mt-16 mx-auto p-8">
        <h1 className="text-2xl text-[#eac6b8] font-bold mb-8">Your Emotional Journey</h1>
        
        {posts.length === 0 ? (
          <div className="text-center py-12">
            
            <h3 className="text-lg font-semibold text-[#a49c96] mb-2">No Timeline Available</h3>
            <p className="text-[#a49c96] max-w-md mx-auto mb-6">
              Create some posts to see your emotional journey over time. Each post will be added to your personal timeline!
            </p>
            
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post, index) => (
              <div key={post._id} className="relative">
                {/* Timeline line */}
                {index < posts.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-full bg-[#a49c96]/20"></div>
                )}
                
                <div className="flex items-start space-x-4">
                  {/* Timeline dot */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-[#f8f5f2] font-bold text-sm bg-[#d98a7d]`}>
                    {index + 1}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm text-[#f8f5f2]">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium text-[#d98a7d] bg-[#f3e2d9]`}>
                        {post.overallMood.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-[#f8f5f2] mb-2 font-medium">
  &ldquo;{post.caption.charAt(0).toUpperCase() + post.caption.slice(1)}&rdquo;
</p>

                    
                    <div className="bg-[#2a2826] p-3 rounded-3xl">
                      <p className="text-[#a49c96] text-sm">{post.detailedMoodDescription}</p>
                    </div>
                    
                    {/* Quick scores */}
                    <div className="flex space-x-4 mt-3 text-xs">
                      <span className={`text-[#f8f5f2]`}>
                        Happiness: {post.mentalHealthTraits.joy}/10
                      </span>
                      <span className={`text-[#f8f5f2]`}>
                        Energy: {post.mentalHealthTraits.energy}/10
                      </span>
                      <span className={`text-[#f8f5f2]`}>
                        Confidence: {post.mentalHealthTraits.bold}/10
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