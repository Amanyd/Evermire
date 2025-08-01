import { NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authOptions } from '../auth/[...nextauth]/route';

// Configure Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Type definitions
interface PostDocument {
  _id: string;
  userId: string;
  caption: string;
  detailedMoodDescription: string;
  mentalHealthTraits: {
    anxiety: number;
    depression: number;
    stress: number;
    happiness: number;
    energy: number;
    confidence: number;
  };
  overallMood: string;
  createdAt: Date;
  suggestions?: {
    activities: string[];
    movies: string[];
    songs: string[];
    food: string[];
    contextHash?: string;
    generatedAt?: Date;
  };
}

interface Suggestions {
  activities: string[];
  movies: string[];
  songs: string[];
  food: string[];
}

export async function GET() {
  try {
    const session: Session | null = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const posts = await Post.find({ userId: session.user.id }).sort({ createdAt: -1 });

    if (posts.length === 0) {
      return NextResponse.json({ 
        totalPosts: 0,
        averageScores: {
          anxiety: 0,
          depression: 0,
          stress: 0,
          happiness: 0,
          energy: 0,
          confidence: 0
        },
        moodDistribution: {
          very_happy: 0,
          happy: 0,
          neutral: 0,
          sad: 0,
          very_sad: 0
        },
        recentTrends: {
          anxiety: [],
          depression: [],
          stress: [],
          happiness: [],
          energy: [],
          confidence: []
        },
        topMoodDescriptions: [],
        suggestions: {
          activities: [],
          movies: [],
          songs: [],
          food: []
        },
        posts: []
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

    // Get contextual suggestions based on last 3 posts
    let suggestions: Suggestions = {
      activities: [],
      movies: [],
      songs: [],
      food: []
    };
    
    if (posts.length > 0) {
      // Get last 3 posts for context
      const last3Posts = posts.slice(0, 3);
      const currentContextHash = createContextHash(last3Posts);
      
      console.log(`Analytics API: Current context hash: ${currentContextHash} (${last3Posts.length} posts)`);
      
      // Check if context has changed
      const user = await User.findById(session.user.id);
      const storedContextHash = user?.lastContextHash;
      
      console.log(`Analytics API: Stored context hash: ${storedContextHash || 'none'}`);
      console.log(`Analytics API: Context changed: ${!storedContextHash || storedContextHash !== currentContextHash}`);
      
      const contextChanged = !storedContextHash || storedContextHash !== currentContextHash;
      
      if (contextChanged) {
        console.log('Analytics API: Context changed, generating new suggestions');
        suggestions = await generateContextualSuggestions(last3Posts);
        
        // Update user's context hash
        const updateResult = await User.findByIdAndUpdate(session.user.id, {
          lastContextHash: currentContextHash,
          lastContextUpdatedAt: new Date()
        }, { new: true });
        
        console.log(`Analytics API: Updated user context hash to ${currentContextHash}`);
        
        // Verify the update worked
        const verifyUser = await User.findById(session.user.id);
        console.log(`Analytics API: Verification - stored hash: ${verifyUser?.lastContextHash}`);
      } else {
        console.log('Analytics API: Context unchanged, using stored suggestions');
        // Get suggestions from the latest post
        const latestPost = posts[0];
        if (latestPost?.suggestions?.activities?.length > 0) {
          suggestions = latestPost.suggestions;
        } else {
          // Fallback: generate suggestions if none stored
          console.log('Analytics API: No stored suggestions found, generating new ones');
          suggestions = await generateContextualSuggestions(last3Posts);
        }
      }
    }

    return NextResponse.json({
      totalPosts: posts.length,
      averageScores,
      moodDistribution,
      recentTrends,
      topMoodDescriptions,
      suggestions,
      posts: posts, // Include posts data for the frontend
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate contextual suggestions based on last 3 posts
async function generateContextualSuggestions(last3Posts: PostDocument[]): Promise<Suggestions> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build context from last 3 posts
    const contextText = last3Posts.length > 0 
      ? `Recent mood context (last ${last3Posts.length} posts):
${last3Posts.map((post, index) => 
  `${index + 1}. ${new Date(post.createdAt).toLocaleDateString()}: "${post.caption}" - ${post.detailedMoodDescription}`
).join('\n')}`
      : 'No recent posts for context.';

    const prompt = `
Based on the user's recent mood journey and mental health state, provide therapeutic and helpful suggestions to improve their well-being and mental health.

${contextText}

Please provide exactly 3 detailed suggestions for each category that could genuinely help improve their mental state. Each suggestion should be 2-3 lines long, explaining what it is and why it could help:

1. Activities (therapeutic, physical, creative, or social activities that could help)
2. Movies (films that could provide comfort, inspiration, or emotional healing)
3. Songs (music that could uplift, comfort, or help process their emotions)
4. Food (meals or snacks that could support their mental health and mood)

Consider their recent emotional journey and patterns when making suggestions. Focus on therapeutic and healing suggestions that could genuinely help them feel better. Explain the benefits of each suggestion.

Examples of detailed suggestions:
- Activities: "Practice mindfulness meditation for 15-20 minutes in a quiet space. This helps reduce stress hormones, improves focus, and creates a sense of inner calm that can carry through your day."
- Movies: "Watch 'The Secret Life of Walter Mitty' - it's about finding courage and adventure in everyday life. The beautiful cinematography and inspiring story can help shift your perspective and remind you of life's possibilities."
- Songs: "Listen to 'Here Comes the Sun' by The Beatles. The gentle melody and hopeful lyrics can help lift your spirits and remind you that difficult times are temporary."
- Food: "Have a small piece of dark chocolate (70% cocoa or higher). It contains compounds that boost serotonin and endorphins, naturally improving your mood while providing antioxidants."

Respond in JSON format:
{
  "activities": ["detailed activity suggestion 1", "detailed activity suggestion 2", "detailed activity suggestion 3"],
  "movies": ["detailed movie suggestion 1", "detailed movie suggestion 2", "detailed movie suggestion 3"],
  "songs": ["detailed song suggestion 1", "detailed song suggestion 2", "detailed song suggestion 3"],
  "food": ["detailed food suggestion 1", "detailed food suggestion 2", "detailed food suggestion 3"]
}
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    if (!response) {
      throw new Error('No response from Gemini');
    }

    // Clean the response to extract JSON
    let jsonString = response.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const suggestions = JSON.parse(jsonString);
    
    return {
      activities: suggestions.activities || [],
      movies: suggestions.movies || [],
      songs: suggestions.songs || [],
      food: suggestions.food || []
    };
  } catch (error) {
    console.error('Error generating contextual suggestions:', error);
    // Return default suggestions if AI fails
    return {
      activities: ['Take a walk in nature', 'Practice deep breathing', 'Call a friend'],
      movies: ['The Secret Life of Walter Mitty', 'La La Land', 'Inside Out'],
      songs: ['Here Comes the Sun', 'Don\'t Stop Believin\'', 'Happy'],
      food: ['Dark chocolate', 'Green tea', 'Nuts and berries']
    };
  }
}

// Helper function to create a hash of the context
function createContextHash(last3Posts: PostDocument[]): string {
  const contextString = last3Posts.map(post => 
    `${post._id}-${post.detailedMoodDescription}`
  ).join('|');
  
  console.log(`Analytics API: Context string: ${contextString.substring(0, 100)}...`);
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < contextString.length; i++) {
    const char = contextString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const hashString = hash.toString();
  console.log(`Analytics API: Generated hash: ${hashString}`);
  
  return hashString;
}
