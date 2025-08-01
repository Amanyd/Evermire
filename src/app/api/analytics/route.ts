import { NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authOptions } from '@/lib/auth';

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

    // Generate contextual suggestions based on last 3 posts
    let suggestions: Suggestions = {
      activities: [],
      movies: [],
      songs: [],
      food: []
    };

    if (posts.length > 0) {
      const last3Posts = posts.slice(0, 3);
      
      // Enhanced debugging - show which posts are being used
      console.log(`Analytics API: Total posts found: ${posts.length}`);
      console.log(`Analytics API: Last 3 posts being used for context:`);
      last3Posts.forEach((post, index) => {
        console.log(`  Post ${index + 1}: ID=${post._id}, Created=${new Date(post.createdAt).toLocaleString()}, MoodDesc=${post.detailedMoodDescription.substring(0, 50)}...`);
      });
      
      const currentContextHash = createContextHash(last3Posts);
      
      console.log(`Analytics API: Current context hash: ${currentContextHash} (${last3Posts.length} posts)`);
      
      // Check if context has changed
      const user = await User.findById(session.user.id);
      const storedContextHash = user?.lastContextHash;
      const lastUpdated = user?.lastContextUpdatedAt;
      
      console.log(`Analytics API: Stored context hash: ${storedContextHash || 'none'}`);
      console.log(`Analytics API: Last updated: ${lastUpdated || 'never'}`);
      
      const contextChanged = !storedContextHash || storedContextHash !== currentContextHash;
      
      console.log(`Analytics API: Context changed: ${contextChanged}`);
      console.log(`Analytics API: Should regenerate: ${contextChanged}`);
      
      // Only regenerate when context actually changes (no time-based refresh)
      
      if (contextChanged) {
        console.log('Analytics API: Context changed, generating new suggestions...');
        console.log('Analytics API: About to call generateContextualSuggestions with', last3Posts.length, 'posts');
        suggestions = await generateContextualSuggestions(last3Posts);
        console.log('Analytics API: Received suggestions:', {
          activities: suggestions.activities.length,
          movies: suggestions.movies.length, 
          songs: suggestions.songs.length,
          food: suggestions.food.length
        });
        console.log('Analytics API: First activity suggestion:', suggestions.activities[0]?.substring(0, 100) + '...');
        console.log('Analytics API: Are these AI-generated or defaults?');
        
        // Store suggestions in the user document for caching
        await User.findByIdAndUpdate(session.user.id, {
          lastContextHash: currentContextHash,
          lastContextUpdatedAt: new Date(),
          cachedSuggestions: suggestions
        });
        
        console.log(`Analytics API: Updated user context hash to ${currentContextHash} and cached suggestions`);
      } else {
        console.log('Analytics API: Context unchanged, using cached suggestions');
        // Use cached suggestions to avoid unnecessary API calls
        const cachedSuggestions = user?.cachedSuggestions;
        console.log('Analytics API: Cached suggestions found:', !!cachedSuggestions);
        console.log('Analytics API: Cached suggestions structure:', {
          activities: cachedSuggestions?.activities?.length || 0,
          movies: cachedSuggestions?.movies?.length || 0,
          songs: cachedSuggestions?.songs?.length || 0,
          food: cachedSuggestions?.food?.length || 0
        });
        
        if (cachedSuggestions && 
            cachedSuggestions.activities?.length > 0 && 
            cachedSuggestions.movies?.length > 0 && 
            cachedSuggestions.songs?.length > 0 && 
            cachedSuggestions.food?.length > 0) {
          suggestions = cachedSuggestions;
          console.log('Analytics API: Using cached suggestions, no API call needed');
        } else {
          console.log('Analytics API: No valid cached suggestions found, generating new ones');
          suggestions = await generateContextualSuggestions(last3Posts);
          // Cache the new suggestions
          console.log('Analytics API: Caching new suggestions...');
          await User.findByIdAndUpdate(session.user.id, {
            cachedSuggestions: suggestions
          });
          console.log('Analytics API: Suggestions cached successfully');
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
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    // Create context from last 3 posts
    const contextText = last3Posts.map((post, index) => {
      return `Post ${index + 1} (${new Date(post.createdAt).toLocaleDateString()}):
Caption: "${post.caption}"
Mood Description: "${post.detailedMoodDescription}"
Mental Health Scores: Anxiety(${post.mentalHealthTraits.anxiety}/10), Depression(${post.mentalHealthTraits.depression}/10), Stress(${post.mentalHealthTraits.stress}/10), Happiness(${post.mentalHealthTraits.happiness}/10), Energy(${post.mentalHealthTraits.energy}/10), Confidence(${post.mentalHealthTraits.confidence}/10)
Overall Mood: ${post.overallMood}`;
    }).join('\n\n');

    const prompt = `You are a compassionate mental health assistant analyzing someone's recent emotional journey. Based on their last 3 journal entries, provide therapeutic suggestions to help improve their wellbeing.

RECENT EMOTIONAL JOURNEY:
${contextText}

INSTRUCTIONS:
Generate exactly 3 concise, therapeutic suggestions for each category. Each suggestion should be exactly 2 lines:
Line 1: What the suggestion is and why it helps
Line 2: How to implement it or get started

CATEGORIES:
1. ACTIVITIES: Therapeutic, physical, creative, or social activities
2. MOVIES: Films for comfort, inspiration, or emotional healing  
3. SONGS: Specific song titles with artist names to uplift, comfort, or process emotions
4. FOOD: Meals/snacks that support mental health and mood

EXAMPLE FORMAT (follow this exact 2-line structure):
"Practice 15-minute mindfulness meditation to reduce anxiety and improve emotional regulation.
Find a quiet space, focus on breathing, start with guided apps like Headspace."

FOR SONGS - Always include specific song title and artist:
"Listen to 'Weightless' by Marconi Union to reduce anxiety and promote deep relaxation.
This scientifically-designed track can lower heart rate and cortisol levels within minutes."

IMPORTANT: 
- Each suggestion must be exactly 2 lines
- Keep lines concise but informative
- Focus on their specific emotional patterns and needs
- Make suggestions actionable and therapeutic

Return ONLY valid JSON in this exact format:
{
  "activities": [
    "First detailed activity suggestion with explanation and benefits...",
    "Second detailed activity suggestion with explanation and benefits...", 
    "Third detailed activity suggestion with explanation and benefits..."
  ],
  "movies": [
    "First detailed movie suggestion with why it helps and what to expect...",
    "Second detailed movie suggestion with why it helps and what to expect...",
    "Third detailed movie suggestion with why it helps and what to expect..."
  ],
  "songs": [
    "First detailed song suggestion with emotional benefits and why...",
    "Second detailed song suggestion with emotional benefits and why...",
    "Third detailed song suggestion with emotional benefits and why..."
  ],
  "food": [
    "First detailed food suggestion with mental health benefits explained...",
    "Second detailed food suggestion with mental health benefits explained...",
    "Third detailed food suggestion with mental health benefits explained..."
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    if (!response) {
      throw new Error('No response from Gemini');
    }

    console.log('Raw AI Response:', response.substring(0, 500) + '...');

    // More robust JSON extraction
    let jsonString = response.trim();
    
    // Remove markdown code blocks
    if (jsonString.includes('```json')) {
      const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }
    } else if (jsonString.includes('```')) {
      const jsonMatch = jsonString.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }
    }

    // Find JSON object boundaries
    const startIndex = jsonString.indexOf('{');
    const lastIndex = jsonString.lastIndexOf('}');
    
    if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
      jsonString = jsonString.substring(startIndex, lastIndex + 1);
    }

    console.log('Cleaned JSON String:', jsonString.substring(0, 300) + '...');

    const suggestions = JSON.parse(jsonString);
    
    // Validate that suggestions are detailed enough
    const validateSuggestions = (suggestions: any) => {
      const categories = ['activities', 'movies', 'songs', 'food'];
      for (const category of categories) {
        if (!suggestions[category] || !Array.isArray(suggestions[category])) {
          throw new Error(`Missing or invalid ${category} suggestions`);
        }
        for (const suggestion of suggestions[category]) {
          if (typeof suggestion !== 'string' || suggestion.length < 100) {
            console.warn(`Short suggestion detected in ${category}: ${suggestion}`);
          }
        }
      }
    };

    validateSuggestions(suggestions);
    
    return {
      activities: suggestions.activities || [],
      movies: suggestions.movies || [],
      songs: suggestions.songs || [],
      food: suggestions.food || []
    };
  } catch (error) {
    console.error('Error generating contextual suggestions:', error);
    console.log('AI FAILED - RETURNING HARDCODED DEFAULT SUGGESTIONS');
    // Return detailed default suggestions if AI fails
    return {
      activities: [
        'Practice mindfulness meditation for 15-20 minutes daily in a quiet space. This helps reduce cortisol levels and activates your parasympathetic nervous system, creating lasting calm and improved emotional regulation throughout your day.',
        'Start a creative journaling practice where you write or draw your feelings without judgment. This therapeutic outlet helps process complex emotions, gain clarity on your thoughts, and track your emotional patterns over time.',
        'Take a 30-minute nature walk while practicing mindful observation of your surroundings. The combination of gentle exercise, fresh air, and natural beauty releases endorphins and reduces stress hormones while grounding you in the present moment.'
      ],
      movies: [
        'Watch "Inside Out" to gain a deeper understanding of emotional complexity and self-compassion. This film beautifully illustrates how all emotions serve important purposes and can help you develop a healthier relationship with your feelings.',
        'Consider "The Pursuit of Happyness" for inspiration during challenging times. The story demonstrates resilience and hope while showing that struggles are temporary, which can provide motivation and perspective on your own journey.',
        'Try "Studio Ghibli films like "My Neighbor Totoro" for gentle comfort and emotional healing. These movies offer beautiful visuals, soothing soundtracks, and themes of hope that can provide a peaceful escape and emotional reset.'
      ],
      songs: [
        'Listen to "Weightless" by Marconi Union, scientifically designed to reduce anxiety by up to 65%. The carefully crafted harmonies, rhythms, and bass lines work together to slow your heart rate and lower cortisol levels naturally.',
        'Play "Here Comes the Sun" by The Beatles when you need hope and optimism. The gentle melody and uplifting lyrics can help shift your mindset from negative thought patterns to a more positive, forward-looking perspective.',
        'Try "Clair de Lune" by Debussy for emotional processing and relaxation. This classical piece helps activate the brain\'s reward system while providing a safe space to feel and process complex emotions without overwhelm.'
      ],
      food: [
        'Enjoy a small piece of dark chocolate (70% cacao or higher) as it contains compounds that boost serotonin and endorphin production. The magnesium also helps relax muscles and calm the nervous system, providing natural mood enhancement.',
        'Prepare a warm cup of chamomile tea with honey before bedtime. Chamomile contains apigenin, which binds to brain receptors to reduce anxiety and promote better sleep quality, essential for emotional regulation and mental health.',
        'Include omega-3 rich foods like walnuts, salmon, or chia seeds in your meals. These healthy fats support brain function and help reduce inflammation linked to depression while stabilizing mood and improving cognitive clarity.'
      ]
    };
  }
}

// Helper function to create a hash of the context
function createContextHash(last3Posts: PostDocument[]): string {
  console.log(`Analytics API: Creating hash for ${last3Posts.length} posts:`);
  
  const contextParts = last3Posts.map((post, index) => {
    // Include post ID, creation timestamp, and mood description to ensure uniqueness
    const part = `${post._id}-${post.createdAt.getTime()}-${post.detailedMoodDescription}`;
    console.log(`  Hash part ${index + 1}: ${part.substring(0, 80)}...`);
    return part;
  });
  
  const contextString = contextParts.join('|');
  console.log(`Analytics API: Full context string length: ${contextString.length}`);
  console.log(`Analytics API: Context string preview: ${contextString.substring(0, 150)}...`);
  
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
