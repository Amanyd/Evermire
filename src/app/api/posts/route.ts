import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authOptions } from '../auth/[...nextauth]/route';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('API: Session received:', session);
    if (!session?.user?.id) {
      console.log('API: No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const posts = await Post.find({ userId: session.user.id }).sort({ createdAt: -1 });
    
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const caption = formData.get('caption') as string;
    const tags = formData.get('tags') as string;

    if (!image || !caption) {
      return NextResponse.json({ error: 'Image and caption are required' }, { status: 400 });
    }

    // Parse tags
    const selectedTags = tags ? JSON.parse(tags) : [];

    // Upload image to Cloudinary
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    const imageUrl = (uploadResult as { secure_url: string }).secure_url;

    // Analyze with Gemini
    const analysis = await analyzeMood(imageUrl, caption, selectedTags, session.user.id);

    await connectDB();
    const post = new Post({
      userId: session.user.id,
      imageUrl,
      caption,
      ...analysis,
    });

    await post.save();
    
    // Update user's context hash since a new post was added
    await updateUserContext(session.user.id);
    
    return NextResponse.json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    await connectDB();
    
    // Find and delete the post
    const deletedPost = await Post.findOneAndDelete({ 
      _id: postId, 
      userId: session.user.id 
    });

    if (!deletedPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Update user's context hash since a post was deleted
    await updateUserContext(session.user.id);

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function analyzeMood(imageUrl: string, caption: string, tags: string[], userId: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Fetch last 3 posts for context
    await connectDB();
    const recentPosts = await Post.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('detailedMoodDescription moodDescription mentalHealthTraits overallMood createdAt caption');

    const contextText = recentPosts.length > 0 
      ? `Previous mood context (last ${recentPosts.length} posts):
${recentPosts.map((post, index) => 
  `${index + 1}. ${new Date(post.createdAt).toLocaleDateString()}: "${post.caption}" - ${post.detailedMoodDescription}`
).join('\n')}`
      : 'No previous posts for context.';

    const tagsText = tags.length > 0 ? `User-selected mood tags: ${tags.join(', ')}` : 'No specific mood tags selected';

    const prompt = `
    Analyze this image and caption to determine the user's mood and mental health traits.
    
    Current post:
    Caption: "${caption}"
    ${tagsText}
    
    ${contextText}
    
    Please provide:
    1. A detailed mood description (4-5 sentences for database storage using "you" - be personal and descriptive, consider how this fits into your emotional journey)
    2. A brief 2-line mood description (2 short sentences using "you" - be descriptive and personal, consider character development)
    3. Mental health trait scores (0-10 scale) for: anxiety, depression, stress, happiness, energy, confidence
    4. Overall mood category: very_happy, happy, neutral, sad, very_sad
    
    Consider the user's emotional journey and how this current mood relates to their recent posts. Look for patterns, improvements, or changes in their mental state.
    
    For both descriptions, be creative and descriptive using "you". Examples:
    - "You appear to be in a positive state of mind today. Your energy seems high and you're radiating confidence."
    - "You seem to be experiencing some stress and anxiety. There's a sense of tension in your current mood."
    - "You look calm and peaceful in this moment. There's a gentle contentment about your current state."
    
    Respond in JSON format:
    {
      "detailedMoodDescription": "detailed 4-5 sentence description using 'you' for database",
      "moodDescription": "2-line descriptive mood analysis using 'you'",
      "mentalHealthTraits": {
        "anxiety": 0-10,
        "depression": 0-10,
        "stress": 0-10,
        "happiness": 0-10,
        "energy": 0-10,
        "confidence": 0-10
      },
      "overallMood": "very_happy|happy|neutral|sad|very_sad"
    }
    `;

    // Convert image URL to base64 for Gemini
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const response = result.response.text();
    if (!response) {
      throw new Error('No response from Gemini');
    }

    // Clean the response to extract JSON from markdown if present
    let jsonString = response.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Try to parse JSON response
    const analysis = JSON.parse(jsonString);
    
    // Generate suggestions based on the analysis
    const suggestions = await generateSuggestions(analysis, caption);

    return {
      detailedMoodDescription: analysis.detailedMoodDescription,
      moodDescription: analysis.moodDescription,
      mentalHealthTraits: analysis.mentalHealthTraits,
      overallMood: analysis.overallMood,
      suggestions: suggestions,
    };
  } catch (error) {
    console.error('Error analyzing mood:', error);
    // Return default analysis if AI fails
    return {
      detailedMoodDescription: 'Unable to analyze mood at this time. The AI analysis could not be completed.',
      moodDescription: 'Unable to analyze mood at this time.',
      mentalHealthTraits: {
        anxiety: 5,
        depression: 5,
        stress: 5,
        happiness: 5,
        energy: 5,
        confidence: 5,
      },
      overallMood: 'neutral',
    };
  }
}

async function generateSuggestions(analysis: {
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
}, caption: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const contextText = `Current mood context: "${caption}" - ${analysis.detailedMoodDescription}
Mental health traits: Anxiety: ${analysis.mentalHealthTraits.anxiety}/10, Depression: ${analysis.mentalHealthTraits.depression}/10, Stress: ${analysis.mentalHealthTraits.stress}/10, Happiness: ${analysis.mentalHealthTraits.happiness}/10, Energy: ${analysis.mentalHealthTraits.energy}/10, Confidence: ${analysis.mentalHealthTraits.confidence}/10
Overall mood: ${analysis.overallMood}`;

    const prompt = `
Based on the user's current mood and mental health state, provide short, actionable suggestions to help improve their well-being.

${contextText}

Please provide exactly 3 SHORT suggestions for each category (keep each suggestion under 4 words):

1. Activities (physical, creative, or social activities)
2. Movies (films that match or could improve their mood)
3. Songs (music that could help their current emotional state)
4. Food (meals or snacks that could support their mental health)

Consider their mental health scores and overall mood when making suggestions. Keep suggestions brief and actionable.

Examples of short suggestions:
- Activities: "Take a walk", "Practice meditation", "Call a friend"
- Movies: "The Secret Life of Walter Mitty", "La La Land", "Inside Out"
- Songs: "Here Comes the Sun", "Don't Stop Believin'", "Happy"
- Food: "Dark chocolate", "Green tea", "Nuts and berries"

Respond in JSON format:
{
  "activities": ["short activity1", "short activity2", "short activity3"],
  "movies": ["short movie1", "short movie2", "short movie3"],
  "songs": ["short song1", "short song2", "short song3"],
  "food": ["short food1", "short food2", "short food3"]
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
    console.error('Error generating suggestions:', error);
    // Return default suggestions if AI fails
    return {
      activities: ['Take a walk in nature', 'Practice deep breathing', 'Call a friend'],
      movies: ['The Secret Life of Walter Mitty', 'La La Land', 'Inside Out'],
      songs: ['Here Comes the Sun', 'Don\'t Stop Believin\'', 'Happy'],
      food: ['Dark chocolate', 'Green tea', 'Nuts and berries']
    };
  }
} 

// Helper function to update user's context hash when new post is added
async function updateUserContext(userId: string) {
  try {
    // Get last 3 posts for new context
    const posts = await Post.find({ userId }).sort({ createdAt: -1 }).limit(3);
    
    if (posts.length > 0) {
      const contextHash = createContextHash(posts);
      
      await User.findByIdAndUpdate(userId, {
        lastContextHash: contextHash,
        lastContextUpdatedAt: new Date()
      });
      
      console.log(`Posts API: Updated user context hash to ${contextHash} (${posts.length} posts)`);
    }
  } catch (error) {
    console.error('Error updating user context:', error);
  }
}

// Helper function to create context hash (same as analytics)
function createContextHash(posts: Array<{ _id: string; detailedMoodDescription: string }>): string {
  const contextString = posts.map(post => 
    `${post._id}-${post.detailedMoodDescription}`
  ).join('|');
  
  let hash = 0;
  for (let i = 0; i < contextString.length; i++) {
    const char = contextString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return hash.toString();
} 