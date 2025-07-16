// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInUser } from '../lib/authService';
import supabase from '../lib/supabaseClient';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
} from '../components/ui/card';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('User already logged in, redirecting...');
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('=== Login Attempt Start ===');
    console.log('Email:', email);

    try {
      const { data, error: signInError } = await signInUser(email, password);

      if (signInError) {
        console.error('Login error:', signInError.message);
        
        // Better error messages
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before logging in.');
        } else {
          setError(signInError.message);
        }
        
        setLoading(false);
        return;
      }

      if (data?.session?.user) {
        console.log('✅ Login successful for:', data.session.user.email);
        setIsRedirecting(true);
        
        // Wait for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Verify session is active before redirecting
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('✅ Session verified, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          console.error('❌ Session not established after login');
          setError('Login successful but session not established. Please try again.');
          setLoading(false);
          setIsRedirecting(false);
        }
      } else {
        console.error('❌ No user returned from login');
        setError('Login failed. Please try again.');
        setLoading(false);
      }

    } catch (err) {
      console.error('💥 Unexpected login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }

    console.log('=== Login Attempt End ===');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
              <img 
                src="/logo.png" 
                alt="Platform Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">Welcome Back</CardTitle>
            <CardDescription className="text-gray-600">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={loading || isRedirecting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={loading || isRedirecting}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm text-center">{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading || isRedirecting}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2.5 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRedirecting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Redirecting...
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col items-center space-y-3 pt-6">
            <div className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a 
                href="/signup" 
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Create one here
              </a>
            </div>
            <div className="text-xs text-gray-500">
              Forgot your password?{' '}
              <a 
                href="/reset-password" 
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Reset it here
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;