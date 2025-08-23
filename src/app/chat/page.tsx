'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface ChatMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchChatHistory();
    }
  }, [status, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Omit<ChatMessage, '_id'> = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage as ChatMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (response.ok) {
        const aiResponse = await response.json();
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Handle error - remove user message and show error
        setMessages(prev => prev.slice(0, -1));
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="spinner"></div></div>;
  }

  return (
    <div className="min-h-screen flex justify-center bg-[#1d1c1a]">
      <Navigation />
      <div className="max-w-5xl w-full mt-18 mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="bg-[#1d1c1a] fixed z-15 w-11/12 max-w-5xl    rounded-b-4xl   px-6 py-4">
          <h1 className="text-2xl font-bold text-[#eac6b8]">Whisper...</h1>
          <p className="text-sm text-[#f8f5f2] mt-1">
            Heya! How have you been feeling lately?
          </p>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-visible p-6 mt-18 pb-20 space-y-4">
          {isLoadingHistory ? ( 
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                {/* <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div> */}
                <div className="spinner"></div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                
                <h3 className="text-lg font-semibold text-[#a49c96] mb-2">Start a conversation</h3>
                <p className="text-[#a49c96] max-w-md mb-4">
                  Your AI assistant is here to help with your mental health journey. 
                  Ask about your mood patterns, get advice, or just chat!
                </p>
                {/* <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-indigo-800">
                    💡 <strong>Tip:</strong> The AI has access to your recent posts and can provide personalized advice based on your mood patterns.
                  </p>
                </div> */}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-6 py-5 rounded-4xl ${
                    message.role === 'user'
                      ? 'bg-[#d98a7d] text-[#f8f5f2]'
                      : 'bg-[#2a2826] text-[#f8f5f2] '
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-[#f8f5f2]' : 'text-[#f8f5f2]'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}

          {/* Loading indicator for AI response */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#2a2826] text-[#f8f5f2]  px-6 py-4 rounded-4xl">
                <div className="flex items-center space-x-2">
                  
                  <span className="text-sm text-[#f8f5f2]">Typing</span>
                  <div className="animate-pulse items-baseline flex space-x-1">
                    <div className="w-1 h-1 bg-[#f8f5f2]/90 rounded-full"></div>
                    <div className="w-1 h-1 bg-[#f8f5f2]/90 rounded-full"></div>
                    <div className="w-1 h-1 bg-[#f8f5f2]/90 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="bg-[#2a2826] rounded-full border-[#d98a7d]/20 border fixed bottom-3 w-11/12 max-w-5xl px-4 py-2">
          <form onSubmit={sendMessage} className="w-full flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-w-0 px-4 py-2 bg-transparent rounded-lg focus:outline-none placeholder:text-[#a49c96]/90 text-[#f8f5f2]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="shrink-0 px-4 py-1 bg-[#d98a7d] text-[#f8f5f2] rounded-full cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 