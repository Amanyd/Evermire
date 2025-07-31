'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Navigation() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/posts" className="text-xl font-bold text-gray-900">
              Mood Journal
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              href="/posts" 
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Posts
            </Link>
            <Link 
              href="/analytics" 
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Analytics
            </Link>
            <Link 
              href="/chat" 
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Chat
            </Link>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Hi, {session?.user?.name || 'User'}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 