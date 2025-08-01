import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import ChatMessage from '@/models/ChatMessage';
import Post from '@/models/Post';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authOptions } from '../auth/[...nextauth]/route';

// Configure Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const messages = await ChatMessage.find({ userId: session.user.id })
      .sort({ timestamp: 1 })
      .limit(50); // Last 50 messages
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    await connectDB();

    // 1. Store user message
    const userMessage = new ChatMessage({
      userId: session.user.id,
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    await userMessage.save();

    // 2. Get context from last 3 posts
    const recentPosts = await Post.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('caption detailedMoodDescription mentalHealthTraits overallMood createdAt');

    // 3. Get recent chat history (last 10 messages for conversation context)
    const chatHistory = await ChatMessage.find({ userId: session.user.id })
      .sort({ timestamp: -1 })
      .limit(10);

    // 4. Generate AI response with context
    const aiResponse = await generateAIResponse(message, recentPosts, chatHistory.reverse());

    // 5. Store AI response
    const assistantMessage = new ChatMessage({
      userId: session.user.id,
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
    });
    await assistantMessage.save();

    return NextResponse.json(assistantMessage);
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateAIResponse(userMessage: string, recentPosts: Array<{
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
}>, chatHistory: Array<{
  role: string;
  content: string;
  timestamp: Date;
}>) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build context from posts
    const postsContext = recentPosts.length > 0 
      ? `Recent mood context (last ${recentPosts.length} posts):
${recentPosts.map((post, index) => 
  `${index + 1}. ${new Date(post.createdAt).toLocaleDateString()}: "${post.caption}" - ${post.detailedMoodDescription}`
).join('\n')}`
      : 'No recent posts for context.';

    // Build conversation history
    const conversationHistory = chatHistory.length > 0 
      ? chatHistory.map(msg => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')
      : 'No previous conversation.';

    const prompt = `
You are a supportive mental health AI assistant. You have access to the user's recent mood journal posts and chat history.

${postsContext}

Recent conversation:
${conversationHistory}

User's current message: "${userMessage}"

Provide a helpful, supportive response that:
1. Acknowledges their current situation or question
2. Offers practical advice, encouragement, or insights
3. References their recent mood patterns if relevant
4. Maintains a warm, empathetic tone
5. Suggests activities or coping strategies when appropriate
6. Keeps responses conversational and under 3-4 sentences

Remember: You're talking to someone who's tracking their mental health through mood journaling. Be supportive, understanding, and helpful.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    if (!response) {
      throw new Error('No response from Gemini');
    }

    return response.trim();
  } catch (error) {
    console.error('Error generating AI response:', error);
    // Return a fallback response if AI fails
    return "I'm here to help with your mental health journey. How are you feeling today?";
  }
} 