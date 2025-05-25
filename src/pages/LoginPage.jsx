// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInUser } from '../lib/authService';
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
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await signInUser(email, password);

      if (signInError) {
        console.error('Supabase login error:', signInError.message);
        setError(signInError.message || 'Login failed. Please try again.');
      } else if (data?.session?.user) {
        console.log('Login successful for user:', data.session.user.email);
        navigate('/dashboard');
      } else {
        console.warn('Login attempt failed with no error and no user.');
        setError('Login failed. No user session returned.');
      }
    } catch (err) {
      console.error('Unexpected login exception:', err);
      setError('Unexpected error during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5'
      }}
    >
      <Card style={{ width: '400px' }}>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter style={{ justifyContent: 'center' }}>
          <p>
            Don't have an account?{' '}
            <a href="/signup" style={{ color: '#007bff', textDecoration: 'none' }}>
              Sign up
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
