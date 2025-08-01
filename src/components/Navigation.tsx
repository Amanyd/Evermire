'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/posts" className="text-lg sm:text-xl font-bold text-gray-900">
              Mood Journal
            </Link>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            <Link 
              href="/posts" 
              className="text-gray-700 hover:text-gray-900 px-1 sm:px-2 py-2 rounded-md text-xs md:text-sm font-medium"
            >
              Posts
            </Link>
            <Link 
              href="/analytics" 
              className="text-gray-700 hover:text-gray-900 px-1 sm:px-2 py-2 rounded-md text-xs md:text-sm font-medium"
            >
              Analytics
            </Link>
            <Link 
              href="/chat" 
              className="text-gray-700 hover:text-gray-900 px-1 sm:px-2 py-2 rounded-md text-xs md:text-sm font-medium"
            >
              Chat
            </Link>
            <Link 
              href="/timeline" 
              className="hidden sm:block text-gray-700 hover:text-gray-900 px-1 sm:px-2 py-2 rounded-md text-xs md:text-sm font-medium"
            >
              Timeline
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="hidden sm:block text-gray-700 hover:text-gray-900 px-1 sm:px-2 py-2 rounded-md text-xs md:text-sm font-medium"
            >
              Logout
            </button>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden text-gray-700 hover:text-gray-900 p-2 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/timeline"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Timeline
              </Link>
              <button
                onClick={() => {
                  signOut({ callbackUrl: '/login' });
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 