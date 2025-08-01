import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
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
    const analysis = await analyzeMood(imageUrl, caption, selectedTags);

    await connectDB();
    const post = new Post({
      userId: session.user.id,
      imageUrl,
      caption,
      ...analysis,
    });

    await post.save();
    
    return NextResponse.json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function analyzeMood(imageUrl: string, caption: string, tags: string[]) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const tagsText = tags.length > 0 ? `User-selected mood tags: ${tags.join(', ')}` : 'No specific mood tags selected';

    const prompt = `
    Analyze this image and caption to determine the user's mood and mental health traits.
    
    Caption: "${caption}"
    ${tagsText}
    
    Please provide:
    1. A detailed mood description (2-3 sentences for database storage)
    2. A brief one-liner mood description (one short sentence using "you" for display)
    3. Mental health trait scores (0-10 scale) for: anxiety, depression, stress, happiness, energy, confidence
    4. Overall mood category: very_happy, happy, neutral, sad, very_sad
    
    Consider the user's self-selected tags when analyzing the mood.
    
    Respond in JSON format:
    {
      "detailedMoodDescription": "detailed 2-3 sentence description for database",
      "moodDescription": "brief one-liner using 'you' for display",
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
    
    return {
      detailedMoodDescription: analysis.detailedMoodDescription,
      moodDescription: analysis.moodDescription,
      mentalHealthTraits: analysis.mentalHealthTraits,
      overallMood: analysis.overallMood,
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