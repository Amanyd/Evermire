'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';


export default function Navigation() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuVariants: Variants = {
    hidden: { height: 0, opacity: 0 },
    visible: {
      height: 'auto',
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        // when: 'beforeChildren',
        staggerChildren: 0.1,
        delayChildren: 0.1,
        delay: 0.1, // Add a delay to the menu opening animation
      },
    },
    exit: { height: 0, opacity: 0, transition: { duration: 0.2 } },
  };

  const linkVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 800, damping: 50 } },
  };

  return (
    <nav className="bg-[#2a2826] w-11/12 max-w-5xl border-[#d98a7d]/20 border px-6 fixed z-20 rounded-3xl mt-3">
      <div className="">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/posts" className="text-2xl sm:text-2xl font-bold text-[#eac6b8]">
              Evermire
            </Link>
          </div>

          <div className="flex items-center ">
            <Link href="/posts" className="text-[#f8f5f2] hover:text-[#eac6b8] px-1 py-2 rounded-md text-sm md:text-sm font-medium">
              Nest
            </Link>
            <Link href="/analytics" className="text-[#f8f5f2] hover:text-[#eac6b8] px-1 py-2 rounded-md text-sm md:text-sm font-medium">
              Pulse
            </Link>
            <Link href="/chat" className="text-[#f8f5f2] hover:text-[#eac6b8] px-1 py-2 rounded-md text-sm md:text-sm font-medium">
              Whisper
            </Link>
            <Link href="/timeline" className="hidden sm:block text-[#f8f5f2] hover:text-[#eac6b8] px-1 py-2 rounded-md text-sm md:text-sm font-medium">
              Moments
            </Link>
            <button
              onClick={() => void signOut({ callbackUrl: '/login' })}
              className="hidden sm:block text-[#f8f5f2] hover:text-[#eac6b8] cursor-pointer px-1 py-2 rounded-md text-sm md:text-sm font-medium"
            >
              Logout
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden text-[#f8f5f2] hover:text-[#eac6b8] p-1 rounded-md"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="sm:hidden bg-[#2a2826] border-gray-200 overflow-hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={menuVariants}
            >
              <div className="px-2 pb-3 space-y-1">
                <motion.div variants={linkVariants}>
                  <Link
                    href="/timeline"
                    className="block py-2 text-left cursor-pointer text-sm md:text-sm font-medium text-[#f8f5f2] hover:text-[#eac6b8]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Moments
                  </Link>
                </motion.div>
                <motion.div variants={linkVariants}>
                  <button
                    onClick={() => {
                      void signOut({ callbackUrl: '/login' });
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left cursor-pointer py-2 text-sm md:text-sm font-medium text-[#f8f5f2] hover:text-[#eac6b8]"
                  >
                    Logout
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
