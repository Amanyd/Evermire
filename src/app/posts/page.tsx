'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface Post {
  _id: string;
  imageUrl: string;
  caption: string;
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

const moodTags = [
  'Happy', 'Sad', 'Anxious', 'Excited', 'Tired', 'Stressed', 
  'Calm', 'Frustrated', 'Confident', 'Lonely'
];

export default function PostsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setPostsLoading(true);
      setError(null);
      console.log('Fetching posts, session:', session);
      const response = await fetch('/api/posts');
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        setPosts(data || []);
      } else {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError(error instanceof Error ? error.message : 'Failed to load posts');
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPosts();
    }
  }, [status, router, fetchPosts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !caption.trim()) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('caption', caption);
    formData.append('tags', JSON.stringify(selectedTags));

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setCaption('');
        setSelectedFile(null);
        setSelectedTags([]);
        fetchPosts();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/posts?id=${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPosts();
      } else {
        console.error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">My Mood Journal</h1>
        
        {/* Create Post Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Post</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="How are you feeling today?"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mood Tags (select all that apply)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {moodTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Post'}
            </button>
          </form>
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          {postsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading your posts...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Posts</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                {error}
              </p>
              <button
                onClick={() => fetchPosts()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Posts Yet</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Start your mental health journey by creating your first post. Share how you&apos;re feeling and get AI-powered insights!
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Upload a photo and write about your day. Our AI will analyze your mood and provide personalized suggestions.
                </p>
              </div>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post._id} className="bg-white rounded-lg shadow p-6 relative">
                <button
                  onClick={() => handleDelete(post._id)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700 text-lg p-1 rounded-full hover:bg-red-50 transition-colors"
                  title="Delete post"
                >
                  🗑️
                </button>
                <div className="flex items-start space-x-4">
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="text-gray-800 mb-2">{post.caption}</p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Mood:</strong> {post.moodDescription || 'Analyzing...'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 