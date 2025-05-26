// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Initial loading state is true
  const [currentUserForEvent, setCurrentUserForEvent] = useState(null); // To track user state for onAuthStateChange logic

  useEffect(() => {
    console.log('AuthProvider mounted');

    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('getUser error:', error.message);
        setUser(null);
        setCurrentUserForEvent(null);
        setLoading(false);
      } else if (data.user) {
        console.log('Loaded user (fetchUser):', data?.user?.email);
        console.log('Authenticated Supabase user ID (fetchUser):', data?.user?.id);
        const { data: profileData, error: profileError } = await supabase
          .from('users_profile')
          .select('tenant_id, role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile (fetchUser):', profileError.message);
          setUser(data.user);
          setCurrentUserForEvent(data.user);
          setLoading(false);
        } else {
          const mergedUser = { ...data.user, ...profileData };
          setUser(mergedUser);
          setCurrentUserForEvent(mergedUser);
          console.log('Merged user data (fetchUser):', mergedUser);
          setLoading(false);
        }
      } else {
        // No user from getUser
        console.log('No initial user from getUser (fetchUser)');
        setUser(null);
        setCurrentUserForEvent(null);
        setLoading(false);
      }
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const previousUserInEvent = currentUserForEvent; // Capture state at the beginning of the event

      if (session?.user) {
        console.log('onAuthStateChange: Event received with session user:', session.user.email, 'ID:', session.user.id);
        if (previousUserInEvent?.id === session.user.id && previousUserInEvent?.tenant_id) {
          console.log('onAuthStateChange: User session active and profile already loaded, ensuring loading is false.');
          if (loading) {
            setLoading(false);
          }
          // It's possible the user object itself (e.g. metadata) changed, so update it, but without profile refetch
          // if (!deepEqual(previousUserInEvent, session.user)) { // Assuming deepEqual utility if needed
          //    const updatedUserWithProfile = { ...session.user, tenant_id: previousUserInEvent.tenant_id, role: previousUserInEvent.role };
          //    setUser(updatedUserWithProfile);
          //    setCurrentUserForEvent(updatedUserWithProfile);
          // }
          return;
        }

        console.log('onAuthStateChange: Processing new user or user without profile.');
        setLoading(true);
        console.log('Authenticated Supabase user ID (onAuthStateChange):', session.user.id);
        const { data: profileData, error: profileError } = await supabase
          .from('users_profile')
          .select('tenant_id, role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile (onAuthStateChange):', profileError.message);
          setUser(session.user);
          setCurrentUserForEvent(session.user);
          setLoading(false);
        } else {
          const mergedUser = { ...session.user, ...profileData };
          setUser(mergedUser);
          setCurrentUserForEvent(mergedUser);
          console.log('Merged user data (onAuthStateChange):', mergedUser);
          setLoading(false);
        }
      } else {
        // No session.user (logout)
        if (previousUserInEvent) {
          console.log('onAuthStateChange: Processing logout.');
          setLoading(true);
          setUser(null);
          setCurrentUserForEvent(null);
          setLoading(false);
        } else {
          console.log('onAuthStateChange: No active session, ensuring loading is false.');
          if (loading) {
            setLoading(false);
          }
        }
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []); // currentUserForEvent should NOT be in dependency array to avoid re-subscribing

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
