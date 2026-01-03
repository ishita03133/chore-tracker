# Loading & Error Handling Guide

## Overview

The app now has simple loading and error handling infrastructure ready for Supabase operations.

## What's Been Added

### 1. **State Variables**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### 2. **Loading Screen**
When `isLoading` is `true`, users see:
- ⏳ Loading spinner
- "Loading..." message
- "Fetching your chores" subtext

### 3. **Error Banner**
When `error` is set, users see:
- ⚠️ Warning icon
- Error message at the top of the page
- Dismissible (X button to close)

### 4. **Disabled Buttons**
All major action buttons are disabled during loading:
- Add Chore
- Add Assignee
- Add Category
- Copy Code
- Sign Out

---

## How to Use (When Implementing Supabase)

### Example 1: Fetching Data

```typescript
const fetchChoresFromSupabase = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    const { supabase } = await import("@/lib/supabaseClient");
    const { data, error: fetchError } = await supabase
      .from("chores")
      .select("*")
      .eq("household_id", householdId);
    
    if (fetchError) throw fetchError;
    
    // Convert and set data
    setChores(data);
    
  } catch (err: any) {
    setError(err.message || "Failed to load chores. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
```

### Example 2: Creating Data

```typescript
const handleAddChoreToSupabase = async (title: string) => {
  setIsLoading(true);
  setError(null);
  
  try {
    const { supabase } = await import("@/lib/supabaseClient");
    const { data, error: insertError } = await supabase
      .from("chores")
      .insert({
        title,
        household_id: householdId,
        completed: false,
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    // Add to local state
    setChores([...chores, data]);
    
  } catch (err: any) {
    setError(err.message || "Failed to add chore. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
```

### Example 3: Deleting Data

```typescript
const handleDeleteChoreFromSupabase = async (choreId: string) => {
  if (!confirm("Delete this chore?")) return;
  
  setIsLoading(true);
  setError(null);
  
  try {
    const { supabase } = await import("@/lib/supabaseClient");
    const { error: deleteError } = await supabase
      .from("chores")
      .delete()
      .eq("id", choreId);
    
    if (deleteError) throw deleteError;
    
    // Remove from local state
    setChores(chores.filter(c => c.id !== choreId));
    
  } catch (err: any) {
    setError(err.message || "Failed to delete chore. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
```

---

## UI States

### Normal State
- All buttons enabled
- No loading indicator
- No error banner

### Loading State
- Full-screen loading message
- All buttons disabled
- Cannot interact with the app

### Error State
- Red error banner at top
- Error message displayed
- Can dismiss error
- Can retry operation

---

## User Experience

**Loading Flow:**
1. User clicks "Add Chore"
2. Screen shows "Loading..."
3. After 1-2 seconds, chore appears
4. Back to normal

**Error Flow:**
1. User clicks "Add Chore"
2. Screen shows "Loading..."
3. Network error occurs
4. Error banner appears: "Failed to add chore. Please try again."
5. User can dismiss error and retry

---

## Best Practices

### ✅ Do:
- Always wrap Supabase calls in try/catch
- Set loading to `true` before async operation
- Set loading to `false` in `finally` block
- Provide helpful error messages
- Allow users to retry failed operations

### ❌ Don't:
- Leave loading state as `true` forever
- Show technical error messages to users
- Forget to handle errors
- Block the UI unnecessarily

---

## Testing Locally

### Test Loading State:
```typescript
// Add artificial delay
const testLoading = async () => {
  setIsLoading(true);
  await new Promise(resolve => setTimeout(resolve, 3000));
  setIsLoading(false);
};
```

### Test Error State:
```typescript
// Trigger error manually
const testError = () => {
  setError("This is a test error message. You can dismiss it.");
};
```

---

## Next Steps

Once Supabase is set up:
1. Replace localStorage operations with Supabase calls
2. Use `setIsLoading(true)` before each Supabase operation
3. Use `setError()` to show friendly error messages
4. Test with slow network to verify UX
5. Add retry buttons for failed operations (optional)

---

**Current Status**: Infrastructure ready, waiting for Supabase connection to use it! 🚀

