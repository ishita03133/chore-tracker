"use client";

import { useState } from "react";

interface LoginScreenProps {
  onLogin: (name: string, householdId: string, userId: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [name, setName] = useState("");
  const [householdCode, setHouseholdCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinHousehold = async () => {
    // Validate inputs
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!householdCode.trim()) {
      setError("Please enter a household code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Import supabase client dynamically to avoid SSR issues
      const { supabase } = await import("@/lib/supabaseClient");

      // Normalize household code (uppercase, no spaces)
      const normalizedCode = householdCode.trim().toUpperCase();

      // Check if household exists, if not create it
      const { data: existingHousehold, error: householdFetchError } = await supabase
        .from("households")
        .select("id")
        .eq("id", normalizedCode)
        .single();

      if (householdFetchError && householdFetchError.code !== "PGRST116") {
        // PGRST116 = not found (which is ok)
        throw householdFetchError;
      }

      // If household doesn't exist, create it
      if (!existingHousehold) {
        const { error: createError } = await supabase
          .from("households")
          .insert({ id: normalizedCode });

        if (createError) throw createError;
      }

      // Create a profile for this user
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          name: name.trim(),
          household_id: normalizedCode,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Success! Save to localStorage and notify parent
      localStorage.setItem("userId", profile.id);
      localStorage.setItem("userName", name.trim());
      localStorage.setItem("householdId", normalizedCode);

      onLogin(name.trim(), normalizedCode, profile.id);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to join household. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomCode = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setHouseholdCode(`${year}-${random}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-purple-950/80 border border-white/30 rounded-3xl shadow-glass-strong p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-purple-700 dark:text-purple-300">
              🏠 Chore Tracker
            </h1>
            <p className="text-sm text-purple-600/80 dark:text-purple-400/80">
              Share chores with your household
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-white/30 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all duration-300 placeholder:text-purple-400/60"
                disabled={isLoading}
              />
            </div>

            {/* Household Code Input */}
            <div>
              <label className="block text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">
                Household Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={householdCode}
                  onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
                  placeholder="e.g., 2025-APT2B"
                  className="flex-1 px-4 py-3 border border-white/30 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all duration-300 placeholder:text-purple-400/60"
                  disabled={isLoading}
                />
                <button
                  onClick={generateRandomCode}
                  disabled={isLoading}
                  className="px-4 py-3 bg-white/40 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md border border-white/20 text-purple-700 dark:text-purple-300 rounded-xl transition-all duration-300 shadow-glass text-sm font-medium disabled:opacity-50"
                  title="Generate random code"
                >
                  🎲
                </button>
              </div>
              <p className="mt-2 text-xs text-purple-600/70 dark:text-purple-400/70">
                Join an existing household or create a new one
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-100/60 dark:bg-red-950/60 border border-red-300/30 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleJoinHousehold}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-purple-600/80 hover:bg-purple-700/90 dark:bg-purple-700/80 dark:hover:bg-purple-600/90 backdrop-blur-md border border-purple-500/20 text-white rounded-xl transition-all duration-300 shadow-glass font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Joining..." : "Join Household"}
            </button>
          </div>

          {/* Info */}
          <div className="pt-4 border-t border-white/20">
            <p className="text-xs text-center text-purple-600/70 dark:text-purple-400/70">
              💡 Share your household code with roommates so they can join
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

