'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import {Trash} from 'lucide-react';
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
  'Calm', 'Frustrated', 'Confident', 'Lonely', 'Curious', 'Hopeful'
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
    return <div className='w-full h-[100vh] flex justify-center items-center'><div className="spinner"></div></div>
  }

  return (
    <div className="min-h-screen bg-[#1d1c1a] flex justify-center ">
      <Navigation />
      <div className="mt-18 mx-auto w-full p-8">
        <h1 className="text-2xl font-bold text-[#eac6b8] mb-8">Nest...</h1>
        
        {/* Create Post Form */}
        <div className="bg-[#2a2826] rounded-3xl p-6 mb-8">
          <h2 className="text-xl text-[#f8f5f2] mb-2 font-semibold">Create New Post</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a49c96] mb-2">
                 Upload Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block cursor-pointer max-w-fit text-sm text-[#a49c96]/40 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#d98a7d] file:text-[#f8f5f2]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a49c96] mb-2">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full text-[#a49c96] focus:outline-none px-4 py-3 text-sm bg-[#1d1c1a] rounded-3xl placeholder:text-[#a49c96]/40"
                rows={3}
                placeholder="How are you feeling today?"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a49c96] mb-2">
                Mood Tags (select all that apply)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {moodTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-2 py-2 text-sm rounded-full text-[#a49c96] transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-[#d98a7d] text-[#f8f5f2]'
                        : 'bg-[#f3e2d9]'
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
              className="bg-[#ef7869] text-[#f8f5f2] px-4 py-2 rounded-full hover:bg-[#d98a7d] cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Post'}
            </button>
          </form>
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          {postsLoading ? (
            <div className="text-center flex justify-center items-center py-12">
              <div className="spinner"></div>
              
            </div>
          ) : error ? (
            <div className="text-center py-12">
              
              <h3 className="text-l  text-[#a49c96] mb-2">Error Loading Posts</h3>
              
              <button
                onClick={() => fetchPosts()}
                className="px-4 py-2 bg-[#d98a7d] text-[#f8f5f2] rounded-full"
              >
                Try Again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              
              <h3 className="text-l  text-[#a49c96] mb-2">No Posts Yet</h3>
              {/* <p className="text-gray-500 max-w-md mx-auto mb-6">
                Start your mental health journey by creating your first post. Share how you&apos;re feeling and get AI-powered insights!
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Upload a photo and write about your day. Our AI will analyze your mood and provide personalized suggestions.
                </p>
              </div> */}
            </div>
          ) : (
            posts.map((post) => (
  <div
    key={post._id}
    className="bg-[#f3e2d9] rounded-4xl p-6 relative overflow-hidden"
  >
    {/* Delete icon */}
    <button
      onClick={() => handleDelete(post._id)}
      className="absolute top-4 right-4 text-[#eac6b8] hover:text-[#d98a7d] text-lg p-1 rounded-full transition-colors z-10"
      title="Delete post"
    >
      <Trash />
    </button>

    {/* Invisible spacer under icon */}
    <div className="float-right w-8 h-8"></div>

    {/* Floated image */}
    <img
      src={post.imageUrl}
      alt="Post"
      className="post-img w-32 h-32 rounded-3xl object-cover float-left mr-4 mb-2"
    />

    {/* Caption */}
    <p className="text-[#d98a7d] mb-2">{post.caption.charAt(0).toUpperCase() + post.caption.slice(1)}</p>

    {/* Mood */}
    <p className="text-sm text-[#a49c96] mb-2">
      <strong>Mood:</strong> {post.moodDescription || 'Analyzing...'}
    </p>

    {/* Date */}
    <p className="text-sm text-[#a49c96] mt-2">
      {new Date(post.createdAt).toLocaleDateString()}
    </p>

    {/* Clear floats */}
    <div className="clear-both"></div>
  </div>
))

          )}
        </div>
      </div>
    </div>
  );
} 