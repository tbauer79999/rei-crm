// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInUser } from '../lib/authService';
import { Button } from '../components/ui/button'; // Assuming you have a Button component
import { Input } from '../components/ui/input';   // Assuming you have an Input component
import { Label } from '../components/ui/label';   // Assuming you have a Label component
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../components/ui/card'; // Assuming Card components

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

    const { data, error: signInError } = await signInUser(email, password);

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    } else if (data.user) {
      navigate('/dashboard'); // Redirect to dashboard on successful login
    } else {
      // Fallback error if no user data is present but no explicit error (should not happen often)
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
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
            {error && <p style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter style={{ justifyContent: 'center' }}>
          <p>Don't have an account? <a href="/signup" style={{ color: '#007bff', textDecoration: 'none' }}>Sign up</a></p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
