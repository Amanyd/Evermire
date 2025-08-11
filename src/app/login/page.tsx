'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/posts');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Account created! You can now sign in.');
        setIsLogin(true);
        setEmail('');
        setPassword('');
        setName('');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isLogin ? handleLogin : handleRegister;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1d1c1a]">
      <div className="max-w-md w-full flex-col justify-center items-center space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#eac6b8]">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-[#a49c96]">
            Your diary, your thoughts, your home.
          </p>
        </div>
        
        <form className="mt-2  space-y-6" onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <input
                type="text"
                required
                className=" bg-[#2a2826] rounded-xl relative block w-full px-3 py-2 placeholder-[#a49c96] text-[#f8f5f2] focus:outline-none sm:text-sm"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div className="rounded-md gap-2 flex-col  -space-y-px">
            <div>
              <input
                type="email"
                required
                className=" bg-[#2a2826] rounded-xl relative block w-full px-3 py-2 placeholder-[#a49c96] text-[#f8f5f2] focus:outline-none sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className='mt-2'>
              <input
                type="password"
                required
                className=" bg-[#2a2826] rounded-xl relative block w-full px-3 py-2 placeholder-[#a49c96] text-[#f8f5f2] focus:outline-none sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-[#d98a7d] text-sm text-center">{error}</div>
          )}
          
          {message && (
            <div className="text-[#d98a7d] text-sm text-center">{message}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full cursor-pointer flex justify-center py-2 px-4  text-sm font-medium rounded-xl text-[#f8f5f2] bg-[#ef7869] hover:bg-[#d98a7d] "
            >
              {loading 
                ? (isLogin ? 'Signing in...' : 'Creating account...') 
                : (isLogin ? 'Sign in' : 'Create account')
              }
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setMessage('');
            }}
            className="text-[#f8f5f2] cursor-pointer hover:text-[#d98a7d] text-sm"
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div>
      </div>
    </div>
  );
} 