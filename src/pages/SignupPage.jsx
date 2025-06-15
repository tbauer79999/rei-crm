// ===================================================================
// src/pages/SignupPage.jsx - FIXED: Handles email-based invitation lookup
// ===================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signUpUser } from '../lib/authService';
import supabase from '../lib/supabaseClient';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../components/ui/card';

// Email Confirmation Waiting Component
const EmailConfirmationWaiting = ({ email, navigate, isInvitedUser, invitationInfo }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  const [canResend, setCanResend] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState(false);

  useEffect(() => {
    let pollInterval;
    let countdownInterval;
    
    // Start polling for email confirmation
    const startPolling = () => {
      setIsChecking(true);
      
      pollInterval = setInterval(async () => {
        try {
          // Try to get fresh session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.log('Session check error:', error);
            return;
          }
          
          if (session?.user?.email_confirmed_at) {
            console.log('✅ Email confirmed! User:', session.user.email);
            clearInterval(pollInterval);
            clearInterval(countdownInterval);
            setIsChecking(false);
            
            // For invited users, process the invitation now
            if (isInvitedUser && !processingInvitation) {
              setProcessingInvitation(true);
              console.log('🎯 Processing invitation after email confirmation...');
              
              try {
                // Call the edge function with the confirmed user
                // Use invitation ID if available, otherwise the function will lookup by email
                const { data, error: edgeError } = await supabase.functions.invoke('process-invitation', {
                  body: {
                    user_id: session.user.id,
                    email: session.user.email,
                    invitation_id: invitationInfo?.invitationId || null
                  }
                });

                if (edgeError) {
                  console.error('❌ Edge Function error:', edgeError);
                  // Continue anyway - the profile might exist
                } else {
                  console.log('✅ Edge Function success:', data);
                }

                console.log('✅ Invitation processed, redirecting to dashboard...');
                
                // Small delay to ensure everything is set up
                setTimeout(() => {
                  navigate('/dashboard', { replace: true });
                }, 1000);
                
              } catch (error) {
                console.error('Error processing invitation:', error);
                // Continue to dashboard anyway
                navigate('/dashboard', { replace: true });
              }
            } else if (!isInvitedUser) {
              // Business admin - check onboarding
              try {
                const { data: tenant } = await supabase
                  .from('tenants')
                  .select('onboarding_complete')
                  .eq('id', session.user.id)
                  .single();

                if (tenant?.onboarding_complete) {
                  navigate('/dashboard', { replace: true });
                } else {
                  navigate('/onboarding', { replace: true });
                }
              } catch (error) {
                console.error('Error checking onboarding:', error);
                navigate('/onboarding', { replace: true });
              }
            }
          }
        } catch (error) {
          console.error('Error checking confirmation status:', error);
        }
      }, 2000); // Check every 2 seconds
    };

    // Countdown timer
    const startCountdown = () => {
      countdownInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    startPolling();
    startCountdown();

    // Cleanup
    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [navigate, isInvitedUser, invitationInfo, processingInvitation]);

  const handleResendEmail = async () => {
    try {
      setCanResend(false);
      setTimeLeft(300);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        console.error('Resend error:', error);
        setCanResend(true);
      } else {
        console.log('Confirmation email resent');
        // Restart countdown
        const countdownInterval = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              setCanResend(true);
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Unexpected error resending email:', error);
      setCanResend(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="text-center py-8">
          {/* Animated Email Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 relative">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isChecking && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email!</h2>
          
          <div className="space-y-4 mb-6">
            <p className="text-gray-600">
              We've sent a confirmation link to:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-medium text-blue-800">{email}</p>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ Click the confirmation link in your email</p>
              <p>🔄 We'll automatically take you to {isInvitedUser ? 'your dashboard' : 'setup'}</p>
              <p>📱 Stay on this page - no need to refresh!</p>
            </div>
          </div>

          {/* Checking Status */}
          {isChecking && (
            <div className="flex items-center justify-center space-x-2 text-blue-600 mb-4">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium">
                {processingInvitation ? 'Setting up your account...' : 'Checking for confirmation...'}
              </span>
            </div>
          )}

          {/* Resend Email Section */}
          <div className="border-t pt-6 space-y-3">
            <p className="text-sm text-gray-500">Didn't receive the email?</p>
            
            {canResend ? (
              <Button 
                onClick={handleResendEmail}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
              >
                Resend Confirmation Email
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">
                  Resend available in {formatTime(timeLeft)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${((300 - timeLeft) / 300) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-6 pt-4 border-t text-xs text-gray-400 space-y-1">
            <p>Check your spam folder if you don't see the email</p>
            <p>The confirmation link expires in 24 hours</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('signup'); // 'signup', 'creating', 'success', 'confirmed'
  const [invitationInfo, setInvitationInfo] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Enhanced URL parameter checking for invitations and email confirmation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Check for invitation parameters - simplified approach
    const invitationEmail = urlParams.get('invitation_email') || hashParams.get('invitation_email');
    const invitationId = urlParams.get('invitation_id') || hashParams.get('invitation_id');
    const tenantId = urlParams.get('tenant_id') || hashParams.get('tenant_id');
    const role = urlParams.get('role') || hashParams.get('role');
    const inviteEmail = urlParams.get('email') || hashParams.get('email');

    // Check for email confirmation parameters
    const confirmed = urlParams.get('confirmed');
    const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
    const type = urlParams.get('type') || hashParams.get('type');

    console.log('🔍 SignupPage URL analysis:', {
      invitationEmail, invitationId, tenantId, role, inviteEmail,
      confirmed, hasAccessToken: !!accessToken, type
    });

    // Handle invitation parameters - email is the key now
    if (invitationEmail) {
      console.log('🎯 Invitation detected for email:', invitationEmail);
      setInvitationInfo({ 
        invitationId: invitationId || null, // ID might not be present
        tenantId, 
        role, 
        email: invitationEmail 
      });
      setEmail(decodeURIComponent(invitationEmail));
    } else if (invitationId) {
      // Fallback for old invitation URLs
      console.log('🎯 Legacy invitation detected:', invitationId);
      setInvitationInfo({ invitationId, tenantId, role, email: inviteEmail });
      if (inviteEmail) {
        setEmail(inviteEmail);
      }
    }

    // Handle email confirmation callback
    if (confirmed === 'true' || (type === 'signup' && accessToken)) {
      console.log('✅ Email confirmation detected in signup page');
      handleEmailConfirmation(accessToken, refreshToken);
      return;
    }

    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('User already logged in, checking redirect...');
        
        // Check if this is an invited user
        const isInvitedUser = session.user.user_metadata?.invited_signup || 
                             session.user.user_metadata?.invitation_id;
        
        if (isInvitedUser) {
          console.log('🎯 Invited user already logged in, going to dashboard');
          navigate('/dashboard');
        } else {
          // Check onboarding status for business admin
          try {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('onboarding_complete')
              .eq('id', session.user.id)
              .single();

            if (tenant?.onboarding_complete) {
              navigate('/dashboard');
            } else {
              navigate('/onboarding');
            }
          } catch (error) {
            console.error('Error checking onboarding:', error);
            navigate('/onboarding');
          }
        }
      }
    };
    
    checkSession();
  }, [navigate, location]);

  const handleEmailConfirmation = async (accessToken, refreshToken) => {
    try {
      console.log('🔄 Processing email confirmation in signup page...');
      setStep('confirmed');
      setMessage('Confirming your email...');

      if (accessToken && refreshToken) {
        // Set the session using the tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to confirm email. Please try again.');
          setStep('signup');
          return;
        }

        if (data?.user) {
          console.log('✅ Email confirmed for user:', data.user.email);
          console.log('🔍 User metadata:', data.user.user_metadata);
          setMessage('Email confirmed! Setting up your account...');

          // Check if this is an invited user from user metadata
          const isInvitedUser = data.user.user_metadata?.invited_signup === true || 
                               data.user.user_metadata?.invitation_id;

          console.log('🎯 Is invited user?', isInvitedUser);

          // For invited users, call the Edge Function to process the invitation
          if (isInvitedUser) {
            console.log('🎯 Processing invitation via Edge Function...');
            setMessage('Processing your invitation...');
            await processInvitationViaEdgeFunction(
              data.user.id,
              data.user.email,
              data.user.user_metadata?.invitation_id || null
            );
          }

          // Redirect based on user type
          setTimeout(() => {
            if (isInvitedUser) {
              console.log('🎯 Invited user confirmed, redirecting to dashboard');
              navigate('/dashboard', { replace: true });
            } else {
              console.log('👤 Business admin confirmed, checking onboarding status');
              // Check onboarding status for business admin
              checkBusinessAdminOnboarding(data.user.id);
            }
          }, 2000);
        }
      } else {
        // No tokens, but confirmation parameter present - session should already be active
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ Session already active, proceeding...');
          console.log('🔍 Session user metadata:', session.user.user_metadata);
          setMessage('Email confirmed! Redirecting...');
          
          // Check if invited user from session metadata
          const isInvitedUser = session.user.user_metadata?.invited_signup === true || 
                               session.user.user_metadata?.invitation_id;
          
          console.log('🎯 Is invited user from session?', isInvitedUser);

          // For invited users, call the Edge Function
          if (isInvitedUser) {
            console.log('🎯 Processing invitation via Edge Function...');
            setMessage('Processing your invitation...');
            await processInvitationViaEdgeFunction(
              session.user.id,
              session.user.email,
              session.user.user_metadata?.invitation_id || null
            );
          }

          setTimeout(() => {
            if (isInvitedUser) {
              navigate('/dashboard', { replace: true });
            } else {
              checkBusinessAdminOnboarding(session.user.id);
            }
          }, 1500);
        } else {
          console.log('❌ No session found after confirmation');
          setError('Email confirmation failed. Please try logging in.');
          setStep('signup');
        }
      }
    } catch (error) {
      console.error('Error handling email confirmation:', error);
      setError('An error occurred during confirmation. Please try again.');
      setStep('signup');
    }
  };

  // Function to call the Edge Function for invitation processing
  const processInvitationViaEdgeFunction = async (userId, email, invitationId) => {
    try {
      console.log('🚀 Calling process-invitation Edge Function...');
      console.log('Data:', { userId, email, invitationId });

      // Use the supabase client's functions.invoke method which handles auth automatically
      const { data, error } = await supabase.functions.invoke('process-invitation', {
        body: {
          user_id: userId,
          email: email,
          invitation_id: invitationId // Can be null - function will lookup by email
        }
      });

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw error;
      }

      console.log('✅ Edge Function success:', data);
      return data;
      
    } catch (error) {
      console.error('💥 Edge Function error:', error);
      // Don't throw - let the user continue even if edge function fails
      // The profile might already exist or be created by triggers
      console.log('⚠️ Continuing despite edge function failure...');
    }
  };

  // Helper function to check business admin onboarding
  const checkBusinessAdminOnboarding = async (userId) => {
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('onboarding_complete')
        .eq('id', userId)
        .single();

      if (tenant?.onboarding_complete) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (error) {
      console.error('Error checking tenant onboarding:', error);
      navigate('/onboarding', { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setStep('creating');

    try {
      console.log('=== Starting Signup Process ===');
      console.log('Invitation info:', invitationInfo);
      
      // Build user metadata for invitations
      let signupOptions = {};
      if (invitationInfo) {
        signupOptions.data = {
          invitation_id: invitationInfo.invitationId,
          tenant_id: invitationInfo.tenantId,
          role: invitationInfo.role,
          invited_signup: true,
          skip_onboarding: true
        };
        console.log('🎯 Including invitation metadata:', signupOptions.data);
        setMessage('Creating your account and joining the team...');
      } else {
        console.log('👤 Regular business admin signup');
        setMessage('Creating your account...');
      }

      // Step 1: Create auth user (with invitation metadata if present)
      const { data, error: signUpError } = await signUpUser(email, password, signupOptions);

      if (signUpError) {
        console.error('Auth signup error:', signUpError.message);
        
        // Better error messages
        if (signUpError.message.includes('already registered')) {
          setError('This email is already registered. Try logging in instead.');
        } else if (signUpError.message.includes('weak password')) {
          setError('Password is too weak. Please use at least 8 characters with numbers and symbols.');
        } else {
          setError(signUpError.message);
        }
        
        setStep('signup');
        setLoading(false);
        return;
      }

      const newUser = data?.user;
      if (!newUser) {
        setError('Account created but user data not returned. Please try logging in.');
        setStep('signup');
        setLoading(false);
        return;
      }

      console.log('✅ Auth user created:', newUser.id);
      console.log('🔍 User metadata stored:', newUser.user_metadata);

      // For invited users, DO NOT call edge function here - wait for email confirmation
      if (invitationInfo) {
        console.log('🎯 Invited user - will process invitation after email confirmation');
        setMessage('Account created! Check your email to verify and join the team.');
        setStep('success');
        setLoading(false);
        return;
      }

      // Business admin flow - create tenant and profile as fallback
      console.log('👤 Business admin signup - setting up company...');
      await setupBusinessAdmin(newUser);

      // Handle post-signup flow
      if (newUser.email_confirmed_at) {
        setMessage('Account created successfully!');
        setStep('success');
        
        setTimeout(() => {
          navigate('/onboarding');
        }, 1500);
      } else {
        setStep('success');
        setMessage('Account created! Check your email to verify your account.');
      }

      console.log('=== Signup Process Complete ===');

    } catch (err) {
      console.error('💥 Unexpected signup error:', err);
      setError('An unexpected error occurred. Please try again.');
      setStep('signup');
    }

    setLoading(false);
  };

  // Helper function to set up business admin (fallback) - ONLY tenant_id
  const setupBusinessAdmin = async (newUser) => {
    try {
      setMessage('Setting up your company...');
      
      // Check if tenant already exists (trigger might have created it)
      const { data: existingTenant, error: tenantCheckError } = await supabase
        .from('tenants')
        .select('id, name, onboarding_complete')
        .eq('id', newUser.id)
        .single();

      if (tenantCheckError && tenantCheckError.code !== 'PGRST116') {
        console.error('Error checking tenant:', tenantCheckError);
        throw new Error('Database error during setup. Please contact support.');
      }

      // Create tenant if doesn't exist (fallback if trigger didn't work)
      if (!existingTenant) {
        console.log('Creating tenant (trigger may not have worked)...');
        const { error: tenantError } = await supabase
          .from('tenants')
          .insert([{
            id: newUser.id,
            tenant_id: newUser.id,
            name: `${email.split('@')[0]}'s Company`,
            onboarding_complete: false
          }]);

        if (tenantError) {
          console.error('Tenant creation error:', tenantError);
          throw new Error('Failed to set up company. Please contact support.');
        }
        console.log('✅ Tenant created via fallback');
      } else {
        console.log('✅ Tenant already exists (trigger worked)');
      }

      // Set up user profile
      setMessage('Finalizing your profile...');
      
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('users_profile')
        .select('id')
        .eq('id', newUser.id)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileCheckError);
        throw new Error(`Database error during profile setup: ${profileCheckError.message}`);
      }

      // Create profile if doesn't exist (fallback if trigger didn't work)
      if (!existingProfile) {
        console.log('Creating user profile (trigger may not have worked)...');
        
        const { error: profileError } = await supabase
          .from('users_profile')
          .insert([{
            id: newUser.id,
            email: newUser.email || email,
            tenant_id: newUser.id,
            role: 'business_admin'
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error(`Profile setup failed: ${profileError.message}. Please contact support.`);
        }

        console.log('✅ User profile created via fallback');
      } else {
        console.log('✅ Profile already exists (trigger worked)');
      }

    } catch (error) {
      console.error('Business admin setup error:', error);
      throw error;
    }
  };

  // Email confirmation success state
  if (step === 'confirmed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="text-center py-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">✅ Email Confirmed!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-medium">Setting up your dashboard...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return <EmailConfirmationWaiting 
      email={email} 
      navigate={navigate} 
      isInvitedUser={!!invitationInfo}
      invitationInfo={invitationInfo}
    />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              {invitationInfo ? 'Join the Team' : 'Create Your Account'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {step === 'creating' 
                ? (invitationInfo ? 'Setting up your team access...' : 'Setting up your lead generation system...')
                : (invitationInfo ? `You've been invited to join as ${invitationInfo.role}` : 'Join thousands of successful real estate professionals')
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {step === 'creating' ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-purple-600 font-medium">{message}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {invitationInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Team Invitation</p>
                        <p className="text-sm text-blue-600">You're joining as {invitationInfo.role}</p>
                      </div>
                    </div>
                  </div>
                )}

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
                    disabled={!!invitationInfo?.email}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                    placeholder="Create a password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm your password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700 text-sm text-center">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium py-2.5 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {invitationInfo ? 'Joining Team...' : 'Creating Account...'}
                    </div>
                  ) : (
                    invitationInfo ? 'Join Team' : 'Create Account'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          
          {step === 'signup' && (
            <CardFooter className="flex flex-col items-center space-y-3 pt-6">
              <div className="text-sm text-gray-600">
                Already have an account?{' '}
                <a 
                  href="/login" 
                  className="font-medium text-purple-600 hover:text-purple-500 transition-colors"
                >
                  Sign in here
                </a>
              </div>
              <div className="text-xs text-gray-500 text-center max-w-sm">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;