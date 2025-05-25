// src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpUser } from '../lib/authService';
import supabase from '../lib/supabaseClient';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../components/ui/card';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const { data, error: signUpError } = await signUpUser(email, password);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const newUser = data?.user;

    if (!newUser) {
      setError('Signup succeeded but no user returned.');
      setLoading(false);
      return;
    }

    try {
      const { error: profileError } = await supabase.from('users_profile').insert([
        {
          id: newUser.id,
          email: newUser.email,
          tenant_id: null,
          role: 'member',
        },
      ]);

      if (profileError) {
        console.error('Profile insert error:', profileError.message);
        setError('Signup succeeded but failed to create user profile.');
        setLoading(false);
        return;
      }

      if (newUser.identities && newUser.identities.length > 0) {
        setMessage('Signup successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setMessage('Signup successful! Please check your email to verify your account before logging in.');
      }
    } catch (err) {
      console.error('Unexpected error during profile creation:', err);
      setError('Unexpected error during signup.');
    }

    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: '400px' }}>
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Create a new account.</CardDescription>
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
            {error && <p style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
            {message && <p style={{ color: 'green', marginBottom: '1rem', textAlign: 'center' }}>{message}</p>}
            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter style={{ justifyContent: 'center' }}>
          <p>Already have an account? <a href="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Login</a></p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignupPage;
