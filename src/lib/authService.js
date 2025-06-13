// src/lib/authService.js - FIXED: Added options parameter for invitation metadata
import supabase from '../lib/supabaseClient';

export const signUpUser = async (email, password, options = {}) => {
  const signUpData = {
    email,
    password
  };

  // Add options if provided (for invitation metadata)
  if (options.data) {
    signUpData.options = {
      data: options.data
    };
  }

  console.log('🚀 Signing up user with data:', signUpData);
  
  return supabase.auth.signUp(signUpData);
};

export const signInUser = async (email, password) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOutUser = async () => {
  return supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error.message);
    return null;
  }
  return data?.user;
};

export const onAuthStateChange = (callback) => {
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    // The callback can be called with the user directly from the session
    // or with the entire session object, depending on what the app needs.
    // For simplicity, let's pass the user object.
    callback(session?.user || null);
  });
  // Return the listener so it can be unsubscribed if needed
  return authListener;
};