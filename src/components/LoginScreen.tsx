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
      // Use .maybeSingle() instead of .single() to avoid errors when no rows found
      const { data: existingHousehold, error: householdFetchError } = await supabase
        .from("households")
        .select("id")
        .eq("id", normalizedCode)
        .maybeSingle();

      // maybeSingle returns null if not found (no error), so we only throw on real errors
      if (householdFetchError) {
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
    } catch (err: unknown) {
      console.error("Login error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to join household. Please try again.";
      setError(errorMessage);
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <div className="w-full max-w-lg">
        {/* Simple Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10 border border-gray-200 dark:border-gray-700">
          
          {/* Clear Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏠</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Join Your Household
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your name and household code to get started
            </p>
          </div>

          {/* Simple Form */}
          <div className="space-y-5">
            
            {/* Name Input - Simple & Clear */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinHousehold()}
                placeholder="e.g., Alex"
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* Household Code Input - Simple & Clear */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Household Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={householdCode}
                  onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinHousehold()}
                  placeholder="e.g., HOME-2026"
                  className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono"
                  disabled={isLoading}
                />
                <button
                  onClick={generateRandomCode}
                  disabled={isLoading}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600 rounded-lg transition-all disabled:opacity-50 text-2xl"
                  title="Generate random code"
                >
                  🎲
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">New household?</span> Create a code above. <span className="font-semibold">Joining?</span> Enter your roommate's code.
              </p>
            </div>

            {/* Error Message - Clear & Prominent */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            {/* Submit Button - Clear & Prominent */}
            <button
              onClick={handleJoinHousehold}
              disabled={isLoading || !name.trim() || !householdCode.trim()}
              className="w-full px-6 py-4 text-lg font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-all disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? "Joining Household..." : "Join Household"}
            </button>
          </div>

          {/* Clear Info Box */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
              💡 <span className="font-semibold">Pro tip:</span> Share your household code with roommates so everyone can manage chores together!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

