import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Function to fetch user profile
    const fetchUserProfile = async (sessionUser) => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('users_profile')
          .select('tenant_id, role')
          .eq('id', sessionUser.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError.message);
          setUser(sessionUser);
        } else {
          setUser({ ...sessionUser, ...profileData });
        }
      } catch (error) {
        console.error('Unexpected error fetching profile:', error);
        setUser(sessionUser);
      } finally {
        setLoading(false);
      }
    };

    // Initial session check
    const initializeSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error retrieving session:', error.message);
        setUser(null);
        setLoading(false);
      } else if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    initializeSession();

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => {
        if (session?.user) {
          fetchUserProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
