// src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpUser } from '../lib/authService';
import { Button } from '../components/ui/button';
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

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
    } else if (data.user) {
      // data.user.identities may be empty if email confirmation is pending
      if (data.user.identities && data.user.identities.length > 0) {
        setMessage('Signup successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
         // This case usually means email confirmation is required.
        setMessage('Signup successful! Please check your email to verify your account before logging in.');
      }
    } else {
      // Fallback error
      setError('Signup failed. Please try again.');
    }
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
