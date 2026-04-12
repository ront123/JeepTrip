import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

export interface RegisterParams {
  email: string;
  password: string;
  fullName: string;
  vehicleDetails: string;
}

/** Get Google OAuth URL for WebBrowser */
export async function getGoogleOAuthUrl() {
  const redirectUrl = Linking.createURL('/login');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true, // MUST be true in RN to return the URL for WebBrowser
    },
  });

  if (error) throw error;
  return { url: data.url, redirectUrl };
}

/** Get Apple OAuth URL for WebBrowser */
export async function getAppleOAuthUrl() {
  const redirectUrl = Linking.createURL('/login');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  return { url: data.url, redirectUrl };
}

/** Sign up a new user and insert their profile row */
export async function registerUser({ email, password, fullName, vehicleDetails }: RegisterParams) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        vehicle_details: vehicleDetails,
      },
    },
  });
  
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('No user returned after sign-up');

  return authData.user;
}

/** Sign in an existing user */
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

  return data;
}

/** Fetch or create user profile (useful for social sign-ins) */
export async function getOrCreateProfile(user: User) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  // Create profile if missing (Social Auth case)
  const { data: newProfile, error: createError } = await supabase
    .from('users')
    .insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'New User',
      email: user.email,
      vehicle_details: 'Added via Social Login',
      status: 'approved', // Auto-approve social users to prevent friction
    })
    .select()
    .single();

  if (createError) throw createError;
  return newProfile;
}

/** Sign out */
export async function signOut() {
  await supabase.auth.signOut();
}
