// Supabase Client Configuration
// This client is used to interact with your Supabase database and real-time features
"use client";

import { createClient } from "@supabase/supabase-js";

// Get environment variables
// These are public-safe keys that can be exposed in the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create and export the Supabase client
// This will be used throughout the app for database operations and real-time subscriptions
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

