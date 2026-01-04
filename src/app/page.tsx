"use client"; // This tells Next.js this is a client component (needed for useState and interactivity)

import { useState, useEffect } from "react"; // Import hooks to manage component state and side effects
import { createPortal } from "react-dom"; // Import createPortal to render dropdowns outside the DOM hierarchy
import LoginScreen from "@/components/LoginScreen"; // Custom login component for household auth

/* ============================================
   DATA MODELS - Type Definitions
   ============================================
   These interfaces define the structure of our data.
   TypeScript uses these to ensure we always use the correct data format.
*/

// Assignee represents a person who can be assigned to chores
// UPDATED FOR SUPABASE: Now uses UUID strings and includes household_id
interface Assignee {
  id: string; // UUID from Supabase (e.g., "550e8400-e29b-41d4-a716-446655440000")
  name: string; // Display name (e.g., "Alice", "Bob", "Roommate 1")
  household_id: string; // Links to household - ensures data isolation
}

// Category groups related chores together (e.g., "Kitchen", "Bathroom", "Outdoor")
// UPDATED FOR SUPABASE: Now uses UUID strings and includes household_id
interface Category {
  id: string; // UUID from Supabase
  name: string; // Display name (e.g., "Kitchen", "Bathroom", "Weekly Tasks")
  isOpen?: boolean; // LOCAL ONLY: Whether category is expanded in UI (not saved to DB)
  assigneeIds: string[]; // Array of assignee UUIDs (default assignees for this category)
  household_id: string; // Links to household - ensures data isolation
}

// Chore represents a single task that needs to be done
// UPDATED FOR SUPABASE: Now uses UUID strings and includes household_id
interface Chore {
  id: string; // UUID from Supabase
  title: string; // Name/description of the chore (e.g., "Wash dishes", "Take out trash")
  completed: boolean; // Whether the chore has been completed (true) or not (false)
  assigneeIds: string[]; // Array of assignee UUIDs - allows multiple people per chore
  categoryId?: string | null; // Optional category UUID - null means uncategorized
  household_id: string; // Links to household - ensures data isolation
}

/* ============================================
   DATABASE TYPES - Supabase Response Format
   ============================================
   These types match the snake_case format returned by Supabase.
   We transform these to camelCase for app usage.
*/

interface CategoryDB {
  id: string;
  name: string;
  household_id: string;
  assignee_ids: string[];
}

interface ChoreDB {
  id: string;
  title: string;
  completed: boolean;
  household_id: string;
  assignee_ids: string[];
  category_id: string | null;
}

/* ============================================
   REACT STATE - Data Storage
   ============================================
   useState hooks store our app's data in memory.
   When state changes, React automatically re-renders the component.
*/

// Helper function to safely extract error messages from unknown error types
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
}

export default function Home() {
  /* ============================================
     AUTH STATE - User Identity & Household
     ============================================
     
     LIGHTWEIGHT AUTH MODEL:
     Instead of traditional email/password auth, we use a simple name + household code system.
     This is perfect for household apps where:
     - Trust is assumed (you trust your roommates)
     - Quick setup is important (no email verification)
     - Shared access is desired (everyone in household can edit)
     
     WHY STORE IN LOCALSTORAGE:
     - Persists across page reloads
     - No need for JWT tokens or cookies
     - Easy to implement and understand
     - Can easily upgrade to proper auth later without breaking existing code
  */
  
  // Is the user authenticated (logged in)?
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // User's unique ID from Supabase profiles table (currently unused but kept for future features)
  const [_userId, setUserId] = useState<string | null>(null);
  
  // User's display name
  const [userName, setUserName] = useState<string | null>(null);
  
  // Household code this user belongs to (shared between roommates)
  const [householdId, setHouseholdId] = useState<string | null>(null);
  
  /* ============================================
     STATE INITIALIZATION - HYDRATION SAFE
     ============================================
     
     CRITICAL FOR NEXT.JS:
     To avoid hydration mismatches, server and client must render IDENTICAL HTML initially.
     
     THE HYDRATION PROCESS:
     1. Server (Build): Renders static HTML with empty arrays → Fast initial load
     2. Browser (First Paint): Shows server HTML instantly → User sees page immediately
     3. Client (Hydration): React "hydrates" the HTML, making it interactive
     4. After Hydration: useEffect runs, loads localStorage data, updates display
     
     WHY WE START WITH EMPTY ARRAYS:
     - Server: Always renders with [] (no localStorage on server)
     - Client: Also starts with [] (matching server HTML)
     - After hydration: useEffect loads data from localStorage
     - Result: No hydration mismatch! ✅
     
     WHAT HAPPENS IF WE LOAD IN useState:
     - Server: Renders with [] (no localStorage)
     - Client: Immediately loads from localStorage → [{chore1}, {chore2}]
     - HTML doesn't match → Hydration error! ❌
  */
  
  // State to store all assignees (people who can do chores)
  // Starts empty - will be loaded from localStorage in useEffect
  const [assignees, setAssignees] = useState<Assignee[]>([]);

  // State to store all categories (groups of related chores)
  // Starts empty - will be loaded from localStorage in useEffect
  const [categories, setCategories] = useState<Category[]>([]);

  // State to store all chores (tasks that need to be done)
  // Starts empty - will be loaded from localStorage in useEffect
  const [chores, setChores] = useState<Chore[]>([]);
  
  // State to control whether the "add chore" input form is visible
  // When true, the input form is shown; when false, it's hidden
  // This allows us to show/hide the form without losing the input value
  const [isAddingChore, setIsAddingChore] = useState(false);

  // State to store the text the user is typing for a new chore title
  // This is separate from the chores array - it's just temporary input
  const [newChoreTitle, setNewChoreTitle] = useState("");

  // State to store the selected category ID for the new chore being created
  // When undefined, the chore will be uncategorized
  // When set to a category ID, the chore will be assigned to that category
  const [newChoreCategoryId, setNewChoreCategoryId] = useState<string | undefined>(undefined);
  
  // State to control whether the "add category" input form is visible
  // When true, the input form is shown; when false, it's hidden
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // State to store the text the user is typing for a new category name
  // This is separate from the categories array - it's just temporary input
  const [newCategoryName, setNewCategoryName] = useState("");

  // State to control whether the "add assignee" input form is visible
  // When true, the input form is shown; when false, it's hidden
  const [isAddingAssignee, setIsAddingAssignee] = useState(false);

  // State to store the text the user is typing for a new assignee name
  // This is separate from the assignees array - it's just temporary input
  const [newAssigneeName, setNewAssigneeName] = useState("");

  // State to track which chore's assignee selector is currently open
  // When set to a chore ID, that chore's assignee selector is visible
  // When null, no selector is open
  const [openAssigneeSelector, setOpenAssigneeSelector] = useState<string | null>(null);

  // State to track which category's assignee selector is currently open
  // When set to a category ID, that category's assignee selector is visible
  // When null, no selector is open
  const [openCategoryAssigneeSelector, setOpenCategoryAssigneeSelector] = useState<string | null>(null);

  // State to track which category is currently adding a chore inline
  // When set to a category ID, that category shows an inline chore creation form
  // When null, no inline form is shown
  const [addingChoreInCategory, setAddingChoreInCategory] = useState<string | null>(null);

  // State to store the title for a new chore being added within a category
  const [newChoreTitleInCategory, setNewChoreTitleInCategory] = useState("");

  // State to track if user is adding a new assignee from within a chore's assignee selector
  // When set to a chore ID, that chore's selector shows "add new assignee" form
  // When null, no inline assignee creation is shown
  const [addingAssigneeInChore, setAddingAssigneeInChore] = useState<string | null>(null);

  // State to store the name for a new assignee being created from a chore selector
  const [newAssigneeNameInChore, setNewAssigneeNameInChore] = useState("");

  // State to store the position of the dropdown (for fixed positioning)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // State to track if component is mounted (needed for portal rendering)
  const [isMounted, setIsMounted] = useState(false);
  
  // State to track if household code was just copied (for showing feedback)
  const [codeCopied, setCodeCopied] = useState(false);
  
  // Loading and error states for Supabase operations
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ============================================
     LOCALSTORAGE PERSISTENCE - LOAD & SAVE
     ============================================
     
     TWO-PHASE APPROACH:
     Phase 1 (LOAD): Run once on mount to load saved data
     Phase 2 (SAVE): Run whenever data changes to save updates
     
     WHY THIS WORKS:
     1. Component mounts with empty arrays (server and client match)
     2. useEffect runs AFTER hydration completes
     3. Loads data from localStorage
     4. Updates state → Screen updates with saved data
     5. Subsequent changes auto-save to localStorage
     
     NEXT.JS CLIENT-SIDE CONSTRAINT:
     ⚠️ localStorage only exists in the browser (not on server)
     - useEffect only runs on client-side (after hydration)
     - Safe to use localStorage inside useEffect
     - No hydration mismatch! ✅
  */
  
  // Set mounted state for portal rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Check for existing auth on mount
  useEffect(() => {
    // Load auth data from localStorage if it exists
    const savedUserId = localStorage.getItem("userId");
    const savedUserName = localStorage.getItem("userName");
    const savedHouseholdId = localStorage.getItem("householdId");
    
    if (savedUserId && savedUserName && savedHouseholdId) {
      // User is already logged in
      setUserId(savedUserId);
      setUserName(savedUserName);
      setHouseholdId(savedHouseholdId);
      setIsAuthenticated(true);
    }
  }, []);
  
  // Login handler - called when user successfully joins a household
  const handleLogin = (name: string, household: string, uid: string) => {
    setUserName(name);
    setHouseholdId(household);
    setUserId(uid);
    setIsAuthenticated(true);
  };
  
  // Sign out handler - clears auth and returns to login screen
  const handleSignOut = () => {
    // Confirm before signing out
    if (confirm("Are you sure you want to sign out? Your chores will remain in the household.")) {
      // Clear auth data from localStorage
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      localStorage.removeItem("householdId");
      
      // Reset auth state
      setUserId(null);
      setUserName(null);
      setHouseholdId(null);
      setIsAuthenticated(false);
    }
  };

  // Delete assignee handler - removes assignee and clears from chores/categories
  const handleDeleteAssignee = async (assigneeId: string) => {
    const assignee = assignees.find((a) => a.id === assigneeId);
    if (!assignee) return;
    
    // Check if assignee is used in any chores
    const choresUsingAssignee = chores.filter((chore) =>
      chore.assigneeIds.includes(assigneeId)
    );
    
    // Check if assignee is used in any categories
    const categoriesUsingAssignee = categories.filter((cat) =>
      cat.assigneeIds.includes(assigneeId)
    );
    
    // Build confirmation message
    let confirmMessage = `Delete "${assignee.name}"?`;
    if (choresUsingAssignee.length > 0 || categoriesUsingAssignee.length > 0) {
      confirmMessage += `\n\nThis will remove them from:`;
      if (choresUsingAssignee.length > 0) {
        confirmMessage += `\n• ${choresUsingAssignee.length} chore(s)`;
      }
      if (categoriesUsingAssignee.length > 0) {
        confirmMessage += `\n• ${categoriesUsingAssignee.length} category/categories`;
      }
    }
    
    if (!confirm(confirmMessage)) return;
    
    // Optimistic UI update
    setChores(chores.map((chore) => ({
      ...chore,
      assigneeIds: chore.assigneeIds.filter((id) => id !== assigneeId),
    })));
    setCategories(categories.map((cat) => ({
      ...cat,
      assigneeIds: cat.assigneeIds.filter((id) => id !== assigneeId),
    })));
    setAssignees(assignees.filter((a) => a.id !== assigneeId));
    
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Remove assignee from all chores (update arrays, use snake_case for DB)
      for (const chore of choresUsingAssignee) {
        await supabase
          .from("chores")
          .update({ assignee_ids: chore.assigneeIds.filter(id => id !== assigneeId) })
          .eq("id", chore.id);
      }
      
      // Remove assignee from all categories (update arrays, use snake_case for DB)
      for (const cat of categoriesUsingAssignee) {
        await supabase
          .from("categories")
          .update({ assignee_ids: cat.assigneeIds.filter(id => id !== assigneeId) })
          .eq("id", cat.id);
      }
      
      // Delete the assignee
      const { error: deleteError } = await supabase
        .from("assignees")
        .delete()
        .eq("id", assigneeId);
      
      if (deleteError) throw deleteError;
      
    } catch (err: unknown) {
      console.error("Failed to delete assignee:", err);
      setError(getErrorMessage(err) || "Failed to delete assignee. Please refresh the page.");
    }
  };
  
  /* ============================================
     SUPABASE DATA LOADING
     ============================================
     
     MIGRATION FROM LOCALSTORAGE TO SUPABASE:
     Instead of loading from localStorage, we now fetch from Supabase database.
     
     WHY SUPABASE INSTEAD OF LOCALSTORAGE:
     - Data is shared across all devices in the household
     - Multiple users can see and edit the same chores in real-time
     - Data persists even if you clear browser data
     - Proper multi-user collaboration
     
     HOW IT WORKS:
     1. User logs in → householdId is set
     2. This effect triggers → fetches all data for that household
     3. Data is filtered by household_id (so you only see your household's data)
     4. Loading state shows while fetching
     5. Error state shows if something goes wrong
  */
  
  // Load all data from Supabase when user logs in
  useEffect(() => {
    if (!isAuthenticated || !householdId) return;
    
    const loadDataFromSupabase = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { supabase } = await import("@/lib/supabaseClient");
        
        // Fetch assignees for this household
        const { data: assigneesData, error: assigneesError } = await supabase
          .from("assignees")
          .select("*")
          .eq("household_id", householdId);
        
        if (assigneesError) throw assigneesError;
        setAssignees(assigneesData || []);
        
        // Fetch categories for this household
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .eq("household_id", householdId);
        
        if (categoriesError) throw categoriesError;
        // Transform snake_case from DB to camelCase for app, add isOpen for UI
        setCategories((categoriesData || []).map((cat: CategoryDB) => ({ 
          id: cat.id,
          name: cat.name,
          household_id: cat.household_id,
          assigneeIds: cat.assignee_ids || [],
          isOpen: true 
        })));
        
        // Fetch chores for this household
        const { data: choresData, error: choresError } = await supabase
          .from("chores")
          .select("*")
          .eq("household_id", householdId);
        
        if (choresError) throw choresError;
        // Transform snake_case from DB to camelCase for app
        setChores((choresData || []).map((chore: ChoreDB) => ({
          id: chore.id,
          title: chore.title,
          completed: chore.completed,
          household_id: chore.household_id,
          assigneeIds: chore.assignee_ids || [],
          categoryId: chore.category_id || null
        })));
        
      } catch (err: unknown) {
        console.error("Failed to load data from Supabase:", err);
        setError(getErrorMessage(err) || "Failed to load your chores. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDataFromSupabase();
  }, [isAuthenticated, householdId]); // Run when user logs in or household changes

  // Close dropdowns when clicking outside
  // This improves UX by automatically closing selectors when user clicks elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenAssigneeSelector(null);
      setOpenCategoryAssigneeSelector(null);
      setAddingAssigneeInChore(null);
      setNewAssigneeNameInChore("");
      setDropdownPosition(null); // Reset dropdown position when closing
    };

    // Add event listener when any selector is open
    if (openAssigneeSelector !== null || openCategoryAssigneeSelector !== null) {
      document.addEventListener('click', handleClickOutside);
    }

    // Cleanup: remove event listener when component unmounts or selectors close
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openAssigneeSelector, openCategoryAssigneeSelector]);

  /* ============================================
     FUNCTION - Add New Chore
     ============================================
     This function creates a new chore and adds it to the chores array.
     
     State changes explained:
     1. setChores: Adds the new chore to the array
        - Uses spread operator (...) to copy existing chores
        - Adds the new chore at the end
        - React detects this change and re-renders the component
     
     2. setNewChoreTitle: Clears the input field
        - Resets to empty string so user can type a new chore
     
     3. setIsAddingChore: Hides the input form
        - Sets to false to hide the form after submission
        - The empty state will disappear because chores.length > 0
  */
  const handleAddChore = async () => {
    // Don't add empty chores - check if there's actual text
    if (newChoreTitle.trim() === "") {
      return; // Exit early if input is empty
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Insert new chore into Supabase (use snake_case for DB)
      const { data, error: insertError } = await supabase
        .from("chores")
        .insert({
          title: newChoreTitle.trim(),
          completed: false,
          assignee_ids: [],
          category_id: newChoreCategoryId || null,
          household_id: householdId,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Transform DB response to camelCase for app state (only include needed fields)
      const choreForState: Chore = {
        id: data.id,
        title: data.title,
        completed: data.completed,
        household_id: data.household_id,
        assigneeIds: data.assignee_ids || [],
        categoryId: data.category_id || null
      };
      
      // Add to local state
      setChores([...chores, choreForState]);
      
      // Clear the input field and category selection
    setNewChoreTitle("");
      setNewChoreCategoryId(undefined);
    setIsAddingChore(false);
      
    } catch (err: unknown) {
      console.error("Failed to add chore:", err);
      setError(getErrorMessage(err) || "Failed to add chore. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ============================================
     FUNCTION - Add Chore Within Category (Contextual)
     ============================================
     This function creates a chore directly within a specific category.
     It's triggered from the inline "+ Add Chore" button inside a category section.
     
     CONTEXTUAL CREATION BENEFITS:
     - Category is pre-selected (no dropdown needed)
     - Faster workflow - less clicks
     - Clear visual context - user sees exactly where chore will appear
     - Better organization - encourages categorization
  */
  const handleAddChoreInCategory = async (categoryId: string) => {
    // Don't add empty chores
    if (newChoreTitleInCategory.trim() === "") {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Insert new chore into Supabase (use snake_case for DB)
      const { data, error: insertError } = await supabase
        .from("chores")
        .insert({
          title: newChoreTitleInCategory.trim(),
          completed: false,
          assignee_ids: [],
          category_id: categoryId,
          household_id: householdId,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Transform DB response to camelCase for app state (only include needed fields)
      const choreForState: Chore = {
        id: data.id,
        title: data.title,
        completed: data.completed,
        household_id: data.household_id,
        assigneeIds: data.assignee_ids || [],
        categoryId: data.category_id || null
      };
      
      // Add to local state
      setChores([...chores, choreForState]);
      
      // Clear input and hide form
      setNewChoreTitleInCategory("");
      setAddingChoreInCategory(null);
      
    } catch (err: unknown) {
      console.error("Failed to add chore:", err);
      setError(getErrorMessage(err) || "Failed to add chore. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ============================================
     FUNCTION - Quick Add Assignee from Chore Selector
     ============================================
     This function creates a new assignee directly from a chore's assignee selector.
     It eliminates the need to:
     1. Close the chore selector
     2. Scroll to the assignees section
     3. Add the assignee there
     4. Scroll back to the chore
     5. Reopen the selector
     6. Finally assign them
     
     CONTEXTUAL CREATION BENEFITS:
     - Creates assignee AND assigns them in one action
     - Maintains user focus - no navigation needed
     - Faster workflow - reduces clicks from 6+ to 2
     - Better UX - action completes in context
  */
  const handleQuickAddAssignee = async (choreId: string) => {
    // Don't add empty assignees
    if (newAssigneeNameInChore.trim() === "") {
      return;
    }

    // Check for duplicate names
    const nameExists = assignees.some(
      (assignee) => assignee.name.toLowerCase() === newAssigneeNameInChore.trim().toLowerCase()
    );
    if (nameExists) {
      setError("An assignee with this name already exists.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Create new assignee in Supabase
      const { data: newAssignee, error: insertError } = await supabase
        .from("assignees")
        .insert({
          name: newAssigneeNameInChore.trim(),
          household_id: householdId,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Add to local assignees array
      setAssignees([...assignees, newAssignee]);
      
      // Update chore to include the new assignee
      const chore = chores.find(c => c.id === choreId);
      if (chore) {
        const newAssigneeIds = [...chore.assigneeIds, newAssignee.id];
        
        // Update in Supabase (use snake_case for DB)
        const { error: updateError } = await supabase
          .from("chores")
          .update({ assignee_ids: newAssigneeIds })
          .eq("id", choreId);
        
        if (updateError) throw updateError;
        
        // Update local state
        setChores(chores.map((c) =>
          c.id === choreId ? { ...c, assigneeIds: newAssigneeIds } : c
        ));
      }
      
      // Clear input and hide form
      setNewAssigneeNameInChore("");
      setAddingAssigneeInChore(null);
      
    } catch (err: unknown) {
      console.error("Failed to add assignee:", err);
      setError(getErrorMessage(err) || "Failed to add assignee. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ============================================
     FUNCTION - Toggle Chore Completion
     ============================================
     This function toggles a chore's completed status between true and false.
     
     State changes explained:
     - setChores: Updates the specific chore's completed property
       - Uses .map() to create a new array (React needs new references to detect changes)
       - Finds the chore with matching ID
       - Creates a new chore object with toggled completed status
       - Keeps all other chores unchanged
       - React detects the change and re-renders with updated styling
  */
  const handleToggleChore = async (choreId: string) => {
    // Find the chore to toggle
    const chore = chores.find(c => c.id === choreId);
    if (!chore) return;
    
    // Optimistic UI update - update immediately for responsiveness
    setChores(
      chores.map((c) => c.id === choreId ? { ...c, completed: !c.completed } : c)
    );
    
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Update completed status in Supabase
      const { error: updateError } = await supabase
        .from("chores")
        .update({ completed: !chore.completed })
        .eq("id", choreId);
      
      if (updateError) throw updateError;
      
    } catch (err: unknown) {
      console.error("Failed to toggle chore:", err);
      // Revert optimistic update on error
      setChores(chores.map((c) => c.id === choreId ? { ...c, completed: chore.completed } : c));
      setError(getErrorMessage(err) || "Failed to update chore. Please try again.");
    }
  };

  /* ============================================
     FUNCTION - Add New Assignee
     ============================================
     This function creates a new assignee and adds it to the assignees array.
     
     WHY ASSIGNEES ARE SEPARATE FROM CHORES:
     - Reusability: One person can be assigned to many chores
     - Data Normalization: Store person info once, reference by ID
     - Easy Updates: Change a person's name in one place, updates everywhere
     - Relationships: Chores reference assignees by ID (assigneeIds array)
     - Scalability: Can add properties (email, avatar) without touching chores
     
     State changes explained:
     1. setAssignees: Adds the new assignee to the array
        - Uses spread operator (...) to copy existing assignees
        - Adds the new assignee at the end
        - React detects this change and re-renders the component
     
     2. setNewAssigneeName: Clears the input field
        - Resets to empty string so user can type a new assignee
     
     3. setIsAddingAssignee: Hides the input form
        - Sets to false to hide the form after submission
  */
  const handleAddAssignee = async () => {
    // Don't add empty assignees - check if there's actual text
    if (newAssigneeName.trim() === "") {
      return; // Exit early if input is empty
    }

    // Check for duplicate names (optional - prevents confusion)
    const nameExists = assignees.some(
      (assignee) => assignee.name.toLowerCase() === newAssigneeName.trim().toLowerCase()
    );
    if (nameExists) {
      setError("An assignee with this name already exists.");
      return; // Exit early if name already exists
    }

    setIsLoading(true);
    setError(null);

    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Insert new assignee into Supabase
      const { data, error: insertError } = await supabase
        .from("assignees")
        .insert({
          name: newAssigneeName.trim(),
          household_id: householdId,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Add to local state
      setAssignees([...assignees, data]);

    // Clear the input field
    setNewAssigneeName("");
    setIsAddingAssignee(false);
      
    } catch (err: unknown) {
      console.error("Failed to add assignee:", err);
      setError(getErrorMessage(err) || "Failed to add assignee. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ============================================
     FUNCTION - Add New Category
     ============================================
     This function creates a new category and adds it to the categories array.
     
     State changes explained:
     1. setCategories: Adds the new category to the array
        - Uses spread operator (...) to copy existing categories
        - Adds the new category at the end
        - React detects this change and re-renders the component
     
     2. setNewCategoryName: Clears the input field
        - Resets to empty string so user can type a new category
     
     3. setIsAddingCategory: Hides the input form
        - Sets to false to hide the form after submission
  */
  const handleAddCategory = async () => {
    // Don't add empty categories - check if there's actual text
    if (newCategoryName.trim() === "") {
      return; // Exit early if input is empty
    }

    setIsLoading(true);
    setError(null);

    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Insert new category into Supabase (use snake_case for DB)
      const { data, error: insertError } = await supabase
        .from("categories")
        .insert({
          name: newCategoryName.trim(),
          assignee_ids: [],
          household_id: householdId,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Transform DB response to camelCase for app state (only include needed fields)
      const categoryForState: Category = {
        id: data.id,
        name: data.name,
        household_id: data.household_id,
        assigneeIds: data.assignee_ids || [],
        isOpen: true
      };
      
      // Add to local state with isOpen UI property
      setCategories([...categories, categoryForState]);

    // Clear the input field
    setNewCategoryName("");
    setIsAddingCategory(false);
      
    } catch (err: unknown) {
      console.error("Failed to add category:", err);
      setError(getErrorMessage(err) || "Failed to add category. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ============================================
     FUNCTION - Toggle Assignee on Category
     ============================================
     This function adds or removes an assignee from a category's assigneeIds array.
     Category assignees serve as DEFAULT assignees for all chores in that category.
     
     INHERITANCE LOGIC:
     - Categories have default assignees (category.assigneeIds)
     - Chores inherit these assignees UNLESS they have their own direct assignments
     - If a chore has assigneeIds.length === 0, it inherits from its category
     - If a chore has assigneeIds.length > 0, it uses its own assignments (override)
     
     This allows:
     - Quick assignment of assignees to entire categories (e.g., "Kitchen" → assigned to Alice)
     - Individual chore overrides when needed (e.g., "Deep clean oven" → assigned to Bob)
     - Easy bulk management without losing granular control
  */
  const handleToggleCategoryAssignee = async (categoryId: string, assigneeId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    const isAssigned = category.assigneeIds.includes(assigneeId);
    const newAssigneeIds = isAssigned
      ? category.assigneeIds.filter((id) => id !== assigneeId)
      : [...category.assigneeIds, assigneeId];
    
    // Optimistic UI update
    setCategories(categories.map((cat) =>
      cat.id === categoryId ? { ...cat, assigneeIds: newAssigneeIds } : cat
    ));
    
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Update category assignees in Supabase (use snake_case for DB)
      const { error: updateError } = await supabase
        .from("categories")
        .update({ assignee_ids: newAssigneeIds })
        .eq("id", categoryId);
      
      if (updateError) throw updateError;
      
    } catch (err: unknown) {
      console.error("Failed to update category assignees:", err);
      // Revert optimistic update
      setCategories(categories.map((cat) =>
        cat.id === categoryId ? { ...cat, assigneeIds: category.assigneeIds } : cat
      ));
      setError(getErrorMessage(err) || "Failed to update assignees. Please try again.");
    }
  };

  /* ============================================
     FUNCTION - Get Effective Assignees for a Chore
     ============================================
     This helper function determines which assignees should be shown for a chore.
     
     INHERITANCE LOGIC EXPLAINED:
     1. If chore has direct assignees (assigneeIds.length > 0):
        - Use chore's assignees (OVERRIDE mode)
        - Return: { assigneeIds: chore.assigneeIds, isInherited: false }
     
     2. If chore has NO direct assignees AND belongs to a category:
        - Inherit category's assignees (INHERITED mode)
        - Return: { assigneeIds: category.assigneeIds, isInherited: true }
     
     3. If chore has NO direct assignees AND NO category:
        - No assignees (UNASSIGNED mode)
        - Return: { assigneeIds: [], isInherited: false }
     
     The isInherited flag allows us to style inherited assignees differently
     (e.g., lighter color, italic text, or "inherited" label)
  */
  const getEffectiveAssignees = (chore: Chore): { assigneeIds: string[]; isInherited: boolean } => {
    // If chore has direct assignees, use them (override mode)
    if (chore.assigneeIds.length > 0) {
      return {
        assigneeIds: chore.assigneeIds,
        isInherited: false, // These are directly assigned, not inherited
      };
    }
    
    // If chore belongs to a category, inherit category's assignees
    if (chore.categoryId) {
      const category = categories.find((cat) => cat.id === chore.categoryId);
      if (category && category.assigneeIds.length > 0) {
        return {
          assigneeIds: category.assigneeIds,
          isInherited: true, // These are inherited from category
        };
      }
    }
    
    // No assignees (neither direct nor inherited)
    return {
      assigneeIds: [],
      isInherited: false,
    };
  };

  /* ============================================
     FUNCTION - Toggle Assignee on Chore
     ============================================
     This function adds or removes an assignee from a chore's assigneeIds array.
     
     IMPORTANT: Direct chore assignments OVERRIDE category defaults
     - When you assign someone to a chore, that chore stops inheriting from its category
     - To restore inheritance, you must remove ALL direct assignees from the chore
     
     STATE UPDATE EXPLAINED SIMPLY:
     1. User clicks an assignee in the selector
     2. handleToggleAssignee is called with chore ID and assignee ID
     3. setChores updates the state:
        - Finds the chore with matching ID
        - Checks if assignee ID is already in assigneeIds array
        - If yes: Removes it (unassign)
        - If no: Adds it (assign)
        - Creates a new array (React needs this to detect changes)
        - Other chores stay unchanged
     4. React re-renders the component
     5. The assignee badges update to show the new assignment state
     
     MULTIPLE ASSIGNEES:
     - assigneeIds is an array, so multiple assignees can be assigned
     - Each assignee can be independently added or removed
     - The array is updated using filter (remove) or spread (add)
  */
  const handleToggleAssignee = async (choreId: string, assigneeId: string) => {
    const chore = chores.find(c => c.id === choreId);
    if (!chore) return;
    
          const isAssigned = chore.assigneeIds.includes(assigneeId);
    const newAssigneeIds = isAssigned
      ? chore.assigneeIds.filter((id) => id !== assigneeId)
      : [...chore.assigneeIds, assigneeId];
    
    // Optimistic UI update
    setChores(chores.map((c) =>
      c.id === choreId ? { ...c, assigneeIds: newAssigneeIds } : c
    ));
    
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Update chore assignees in Supabase (use snake_case for DB)
      const { error: updateError } = await supabase
        .from("chores")
        .update({ assignee_ids: newAssigneeIds })
        .eq("id", choreId);
      
      if (updateError) throw updateError;
      
    } catch (err: unknown) {
      console.error("Failed to update chore assignees:", err);
      // Revert optimistic update
      setChores(chores.map((c) =>
        c.id === choreId ? { ...c, assigneeIds: chore.assigneeIds } : c
      ));
      setError(getErrorMessage(err) || "Failed to update assignees. Please try again.");
    }
  };

  /* ============================================
     FUNCTION - Delete Chore
     ============================================
     This function removes a chore from the chores array permanently.
     
     STATE UPDATE EXPLAINED:
     1. User clicks delete button on a chore
     2. handleDeleteChore is called with the chore ID
     3. setChores updates the state:
        - Filters out the chore with matching ID
        - All other chores remain in the array
     4. React re-renders and the chore is gone
     
     NOTE: This is permanent - no undo functionality (yet)
  */
  const handleDeleteChore = async (choreId: string) => {
    if (!confirm("Delete this chore?")) return;
    
    // Optimistic UI update
    setChores(chores.filter((chore) => chore.id !== choreId));
    
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Delete from Supabase
      const { error: deleteError } = await supabase
        .from("chores")
        .delete()
        .eq("id", choreId);
      
      if (deleteError) throw deleteError;
      
    } catch (err: unknown) {
      console.error("Failed to delete chore:", err);
      // Could revert optimistic update here, but for simplicity we'll just show error
      setError(getErrorMessage(err) || "Failed to delete chore. Please refresh the page.");
    }
  };

  /* ============================================
     FUNCTION - Delete Category
     ============================================
     This function removes a category from the categories array.
     
     IMPORTANT: Chores in this category become uncategorized (categoryId = undefined)
     This prevents orphaned chores that reference non-existent categories.
     
     STATE UPDATE EXPLAINED:
     1. User clicks delete button on a category
     2. handleDeleteCategory is called with the category ID
     3. Two state updates happen:
        a. setCategories: Removes the category from the array
        b. setChores: Updates all chores in that category to be uncategorized
     4. React re-renders with category removed and chores moved to uncategorized
  */
  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    if (!confirm(`Delete category "${category.name}"? Chores will be moved to Uncategorized.`)) return;
    
    // Optimistic UI update
    setCategories(categories.filter((c) => c.id !== categoryId));
    setChores(chores.map((chore) => chore.categoryId === categoryId ? { ...chore, categoryId: null } : chore));
    
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Move all chores in this category to uncategorized (use snake_case for DB)
      const { error: updateError } = await supabase
        .from("chores")
        .update({ category_id: null })
        .eq("category_id", categoryId);
      
      if (updateError) throw updateError;
      
      // Delete the category
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);
      
      if (deleteError) throw deleteError;
      
    } catch (err: unknown) {
      console.error("Failed to delete category:", err);
      setError(getErrorMessage(err) || "Failed to delete category. Please refresh the page.");
    }
  };

  /* ============================================
     FUNCTION - Move Chore to Category
     ============================================
     This function assigns a chore to a specific category (or removes categorization).
     Used to move uncategorized chores into categories or recategorize existing chores.
     
     STATE UPDATE EXPLAINED:
     1. User selects a category from the dropdown on an uncategorized chore
     2. handleMoveChoreToCategory is called with chore ID and category ID
     3. setChores updates the state:
        - Finds the chore with matching ID
        - Updates its categoryId property
        - Pass undefined to remove categorization (move back to uncategorized)
     4. React re-renders and the chore appears in the new category
  */
  const handleMoveChoreToCategory = async (choreId: string, categoryId: string | null) => {
    // Optimistic UI update
    setChores(chores.map((chore) =>
      chore.id === choreId ? { ...chore, categoryId } : chore
    ));
    
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Update chore category in Supabase (use snake_case for DB)
      const { error: updateError } = await supabase
        .from("chores")
        .update({ category_id: categoryId })
        .eq("id", choreId);
      
      if (updateError) throw updateError;
      
    } catch (err: unknown) {
      console.error("Failed to move chore:", err);
      setError(getErrorMessage(err) || "Failed to move chore. Please refresh the page.");
    }
  };

  /* ============================================
     FUNCTION - Toggle Category Accordion
     ============================================
     This function toggles a category's isOpen status (accordion expand/collapse).
     
     ACCORDION LOGIC EXPLAINED:
     - An accordion is a UI pattern where sections can be expanded or collapsed
     - When isOpen is true: The category section is expanded (chores are visible)
     - When isOpen is false: The category section is collapsed (chores are hidden)
     - Clicking the category header toggles between these two states
     - Multiple categories can be open at the same time (each has its own isOpen state)
     
     STATE UPDATE EXPLAINED SIMPLY:
     1. User clicks category header
     2. handleToggleCategory is called with the category's ID
     3. setCategories updates the state:
        - Finds the category with matching ID
        - Flips isOpen: true → false, or false → true
        - Creates a new array (React needs this to detect changes)
        - Other categories stay unchanged
     4. React re-renders the component
     5. The chevron rotates and the chore list shows/hides based on the new isOpen value
  */
  const handleToggleCategory = (categoryId: string) => {
    // Update the categories array by mapping over each category
    // Note: isOpen is UI-only state, not saved to Supabase
    setCategories(
      categories.map((category) => {
        // If this is the category we want to toggle
        if (category.id === categoryId) {
          // Return a new category object with toggled isOpen status
          // Spread operator (...) copies all existing properties
          // Then we override just the isOpen property
          return {
            ...category,
            isOpen: !category.isOpen, // Toggle: true becomes false, false becomes true
          };
        }
        // Return unchanged category if ID doesn't match
        // This allows multiple categories to have independent open/closed states
        return category;
      })
    );
  };

  // Show login screen if user is not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  
  // Show loading screen while fetching data
  if (isLoading) {
  return (
      <div className="flex min-h-screen items-center justify-center font-sans">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-xl font-medium text-gray-700 dark:text-gray-300">Loading...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Fetching your chores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      {/* Main content container with centered layout and max width */}
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-start py-16 px-8">
        {/* Error Banner - Shows at top if there's an error */}
        {error && (
          <div className="w-full mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-200">Something went wrong</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Header with title and household info */}
        <div className="w-full mb-8">
          
          {/* Title and Add Button Row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-semibold text-black dark:text-zinc-50">
          Chore Tracker
        </h1>
            
            {/* Add Chore button */}
            {chores.length > 0 && !isAddingChore && (
              <button
                onClick={() => {
                  setIsAddingChore(true);
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-white/40 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md border border-white/20 text-purple-700 dark:text-purple-300 rounded-xl transition-all duration-300 shadow-glass text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Chore
              </button>
            )}
          </div>

          {/* Household Info Card - Prominent & Clear */}
          <div className="p-4 rounded-xl bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/30 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wide mb-1">
                  Your Household
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {userName}
                  </span>
                  <span className="text-purple-400 dark:text-purple-600">•</span>
                  <span className="text-lg font-mono font-bold text-purple-700 dark:text-purple-300">
                    {householdId}
                  </span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Copy Code Button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(householdId || "");
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-600/80 hover:bg-purple-700/90 dark:bg-purple-700/80 dark:hover:bg-purple-600/90 text-white rounded-lg transition-all shadow-sm font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Copy household code"
                >
                  {codeCopied ? (
                    <>
                      <span>✓</span>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
                
                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="px-4 py-2 bg-white/40 hover:bg-red-50/60 dark:bg-white/10 dark:hover:bg-red-900/30 border border-white/30 hover:border-red-300/50 dark:hover:border-red-700/50 text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 rounded-lg transition-all shadow-sm font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sign out of household"
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            
            {/* Helper text */}
            <p className="text-xs text-purple-600/60 dark:text-purple-400/60 mt-2">
              Share this code with roommates so they can join your household
            </p>
          </div>
        </div>

        {/* ============================================
            EMPTY STATE LOGIC
            ============================================
            This section shows content when there are no chores.
            
            How it works:
            - We check if chores.length === 0 (no chores in the array)
            - If true: Show the empty state with message and button
            - If false: Show the list of chores (or input form if adding)
            
            State changes explained:
            - When user clicks "Add your first chore", setIsAddingChore(true)
              This shows the input form inline
            - When a chore is added, chores.length becomes > 0
              This automatically hides the empty state (the condition becomes false)
        */}
        {chores.length === 0 ? (
          /* Empty state - shown when there are no chores */
          <div className="w-full flex flex-col items-center justify-center py-16 px-8">
            {/* Show message and button only if input form is NOT visible */}
            {!isAddingChore ? (
              <>
                {/* Main empty state message */}
                <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4 text-center">
                  No chores yet
          </h2>
          
                {/* Subtext encouraging collaboration */}
                <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-center max-w-md">
                  Start tracking your household chores and work together to keep things organized!
                </p>
                
                {/* Primary call-to-action button */}
                {/* Clicking this reveals the inline input form */}
                <button
                  onClick={() => {
                    // State change: Show the input form
                    // setIsAddingChore(true) updates the state, React re-renders,
                    // and the input form appears inline below
                    setIsAddingChore(true);
                  }}
                  className="px-6 py-3 bg-white/40 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md border border-white/20 text-purple-700 dark:text-purple-300 rounded-xl transition-all duration-300 shadow-glass font-medium"
                >
                  Add your first chore
                </button>
              </>
            ) : (
              /* Inline input form - appears when user clicks "Add your first chore" */
              <div className="w-full max-w-md">
          <input
            type="text"
                  value={newChoreTitle}
                  onChange={(e) => {
                    // State change: Update the input value as user types
                    // setNewChoreTitle updates state, React re-renders,
                    // and the input shows the new text
                    setNewChoreTitle(e.target.value);
                  }}
            onKeyDown={(e) => {
                    // Allow submitting by pressing Enter key
              if (e.key === "Enter") {
                      handleAddChore();
                    }
                    // Allow canceling by pressing Escape key
                    if (e.key === "Escape") {
                      setIsAddingChore(false);
                      setNewChoreTitle("");
                      setNewChoreCategoryId(undefined);
              }
            }}
                  placeholder="Enter chore title..."
                  autoFocus // Automatically focus the input when it appears
                  className="w-full px-4 py-3 mb-3 border border-white/30 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all duration-300 placeholder:text-purple-400/60"
          />
          
          {/* Category selector - only show if categories exist */}
          {categories.length > 0 && (
            <select
              value={newChoreCategoryId ?? ""}
              onChange={(e) => {
                // Update selected category (empty string = undefined = uncategorized)
                const value = e.target.value === "" ? undefined : e.target.value;
                setNewChoreCategoryId(value);
              }}
              className="w-full px-4 py-3 mb-3 border border-white/30 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all duration-300"
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
                <div className="flex gap-3">
                  {/* Submit button - creates the chore */}
                  <button
                    onClick={handleAddChore}
                    className="flex-1 px-4 py-2 bg-purple-600/80 hover:bg-purple-700/90 dark:bg-purple-600/60 dark:hover:bg-purple-700/70 backdrop-blur-sm text-white rounded-xl transition-all duration-300 shadow-glass font-medium"
                  >
                    Add Chore
                  </button>
                  {/* Cancel button - hides the form without creating a chore */}
                  <button
                    onClick={() => {
                      // State change: Hide the form and clear input
                      setIsAddingChore(false);
                      setNewChoreTitle("");
                      setNewChoreCategoryId(undefined);
                    }}
                    className="px-4 py-2 bg-white/30 hover:bg-white/50 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm border border-white/20 text-black dark:text-zinc-50 rounded-xl transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ============================================
             CHORE LIST DISPLAY WITH CATEGORIES
             ============================================
             This section renders chores organized by categories using accordion sections.
             
             ACCORDION LOGIC EXPLAINED:
             1. Grouping: Chores are grouped by their categoryId
                - Chores with a categoryId appear under that category
                - Chores without a categoryId (undefined) appear in "Uncategorized"
             
             2. Accordion Behavior:
                - Each category has an isOpen property (true/false)
                - When isOpen is true: Category section is expanded, chores are visible
                - When isOpen is false: Category section is collapsed, chores are hidden
                - Clicking the category header toggles isOpen
                - No animations yet - just instant show/hide
             
             3. Rendering Flow:
                - First, render all categories with their assigned chores
                - Then, render uncategorized chores in a default section
                - Each section can be independently expanded/collapsed
          */
          <div className="w-full space-y-4">
            {/* Inline chore input form - shown when user clicks "+ Add Chore" button */}
            {isAddingChore && (
              <div className="w-full mb-4 p-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950">
                <input
                  type="text"
                  value={newChoreTitle}
                  onChange={(e) => {
                    setNewChoreTitle(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddChore();
                    }
                    if (e.key === "Escape") {
                      setIsAddingChore(false);
                      setNewChoreTitle("");
                      setNewChoreCategoryId(undefined);
                    }
                  }}
                  placeholder="Enter chore title..."
                  autoFocus
                  className="w-full px-4 py-3 mb-3 border border-white/30 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all duration-300 placeholder:text-purple-400/60"
          />
                
                {/* Category selector - only show if categories exist */}
                {categories.length > 0 && (
                  <select
                    value={newChoreCategoryId ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : e.target.value;
                      setNewChoreCategoryId(value);
                    }}
                    className="w-full px-4 py-3 mb-3 border border-white/30 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all duration-300"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleAddChore}
                    className="flex-1 px-4 py-2 bg-purple-600/80 hover:bg-purple-700/90 dark:bg-purple-600/60 dark:hover:bg-purple-700/70 backdrop-blur-sm text-white rounded-xl transition-all duration-300 shadow-glass font-medium"
                  >
                    Add Chore
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingChore(false);
                      setNewChoreTitle("");
                      setNewChoreCategoryId(undefined);
                    }}
                    className="px-4 py-2 bg-white/30 hover:bg-white/50 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm text-black dark:text-zinc-50 rounded-xl transition-all duration-300 border border-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ============================================
                ASSIGNEES SECTION
                ============================================
                This section displays and manages assignees (people who can do chores).
                
                WHY ASSIGNEES ARE SEPARATE FROM CHORES:
                1. Reusability: One person can be assigned to many different chores
                   - Instead of storing "Alice" in every chore, we store assignee ID
                   - Change Alice's name once, it updates everywhere
                
                2. Data Normalization: Store person info in one place
                   - Assignees are a global list, not tied to specific chores
                   - Chores reference assignees by ID (assigneeIds array)
                   - This prevents duplicate data and inconsistencies
                
                3. Easy Updates: Update person info without touching chores
                   - Change name, email, avatar, etc. in one place
                   - All chores automatically reflect the change
                
                4. Relationships: Many-to-many relationship
                   - One assignee → many chores (via assigneeIds in each chore)
                   - One chore → many assignees (via assigneeIds array)
                   - This structure supports both relationships efficiently
                
                5. Scalability: Easy to add features later
                   - Can add properties (email, avatar, preferences) to Assignee
                   - Don't need to modify Chore interface
                   - All existing chores automatically get access to new properties
            */}
            <div className="mb-6 p-4 rounded-2xl backdrop-blur-md bg-white/60 dark:bg-white/5 border border-white/20 shadow-glass">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                  Assignees
                </h2>
                {!isAddingAssignee ? (
                  <button
                    onClick={() => {
                      // State change: Show the assignee input form
                      setIsAddingAssignee(true);
                    }}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-700/90 dark:bg-purple-600/60 dark:hover:bg-purple-700/70 backdrop-blur-sm text-white rounded-xl transition-all duration-300 shadow-glass text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add Assignee
                  </button>
                ) : (
                  <div className="flex gap-2">
              <input
                      type="text"
                      value={newAssigneeName}
                onChange={(e) => {
                        // State change: Update the input value as user types
                        setNewAssigneeName(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        // Allow submitting by pressing Enter key
                        if (e.key === "Enter") {
                          handleAddAssignee();
                        }
                        // Allow canceling by pressing Escape key
                        if (e.key === "Escape") {
                          setIsAddingAssignee(false);
                          setNewAssigneeName("");
                        }
                      }}
                      placeholder="Enter assignee name..."
                      autoFocus
                      className="flex-1 px-3 py-1.5 border border-white/30 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all duration-300 text-sm placeholder:text-purple-400/60"
                    />
                    <button
                      onClick={handleAddAssignee}
                      className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-700/90 dark:bg-purple-600/60 dark:hover:bg-purple-700/70 backdrop-blur-sm text-white rounded-xl transition-all duration-300 shadow-glass text-sm font-medium"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        // State change: Hide the form and clear input
                        setIsAddingAssignee(false);
                        setNewAssigneeName("");
                      }}
                      className="px-3 py-1.5 bg-white/30 hover:bg-white/50 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm border border-white/20 text-black dark:text-zinc-50 rounded-xl transition-all duration-300 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              {/* List of assignees */}
              {assignees.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No assignees yet. Add someone to get started!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {assignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/40 dark:bg-white/10 border border-white/20 rounded-xl text-sm text-black dark:text-zinc-50 backdrop-blur-sm shadow-sm hover:bg-white/60 dark:hover:bg-white/20 transition-all duration-300"
                    >
                      <span>{assignee.name}</span>
                      <button
                        onClick={() => handleDeleteAssignee(assignee.id)}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-300 text-xs font-bold"
                        title={`Delete ${assignee.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Button to add a new category */}
            <div className="mb-4">
              {!isAddingCategory ? (
                <button
                  onClick={() => {
                    // State change: Show the category input form
                    setIsAddingCategory(true);
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-white/30 hover:bg-white/50 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm border border-white/20 text-black dark:text-zinc-50 rounded-xl transition-all duration-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Category
                </button>
              ) : (
                <div className="flex gap-2">
              <input
                    type="text"
                    value={newCategoryName}
                onChange={(e) => {
                      // State change: Update the input value as user types
                      setNewCategoryName(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      // Allow submitting by pressing Enter key
                      if (e.key === "Enter") {
                        handleAddCategory();
                      }
                      // Allow canceling by pressing Escape key
                      if (e.key === "Escape") {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                  }
                }}
                    placeholder="Enter category name..."
                    autoFocus
                    className="flex-1 px-3 py-2 border border-white/30 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all duration-300 text-sm placeholder:text-purple-400/60"
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-3 py-2 bg-purple-600/80 hover:bg-purple-700/90 dark:bg-purple-600/60 dark:hover:bg-purple-700/70 backdrop-blur-sm text-white rounded-xl transition-all duration-300 shadow-glass text-sm font-medium"
                  >
                    Add
                  </button>
          <button
                    onClick={() => {
                      // State change: Hide the form and clear input
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                    }}
                    className="px-3 py-2 bg-white/30 hover:bg-white/50 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm border border-white/20 text-black dark:text-zinc-50 rounded-xl transition-all duration-300 text-sm"
          >
                    Cancel
          </button>
        </div>
              )}
            </div>

            {/* Render categories as accordion sections */}
            {categories.map((category) => {
              // Filter chores that belong to this category
              const categoryChores = chores.filter(
                (chore) => chore.categoryId === category.id
              );

              return (
                <div
                  key={category.id}
                  className="border border-white/20 rounded-2xl backdrop-blur-md bg-white/50 dark:bg-white/5 overflow-visible shadow-glass transition-all duration-300 hover:shadow-xl hover:bg-white/60 dark:hover:bg-white/10"
                >
                  {/* Category header - contains toggle button and assignee management */}
                  <div className="group flex items-center justify-between p-4 hover:bg-white/30 dark:hover:bg-white/10 transition-all duration-300 rounded-t-2xl">
                    {/* Left side: Toggle button with category name */}
                  <button
                    onClick={() => {
                      // STATE UPDATE: When clicked, toggle this category's visibility
                      // Step 1: handleToggleCategory flips isOpen (true ↔ false)
                      // Step 2: React re-renders with new state
                      // Step 3: Chevron rotates and chore list shows/hides
                      handleToggleCategory(category.id);
                    }}
                      className="flex items-center gap-2 text-left flex-1"
                    aria-expanded={category.isOpen}
                  >
                      {/* Chevron icon - rotates based on isOpen state */}
                      {/* 
                        ROTATION LOGIC:
                        - When isOpen is true: Chevron points down (0deg rotation) - section is open
                        - When isOpen is false: Chevron points right (90deg rotation) - section is closed
                        - CSS transform rotates the chevron smoothly
                        - The transition class makes the rotation smooth (no animation yet, but ready for it)
                      */}
                      <svg
                        className={`w-5 h-5 text-zinc-500 dark:text-zinc-400 transition-transform ${
                          category.isOpen ? "rotate-0" : "-rotate-90"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                        {category.name}
                      </h2>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        ({categoryChores.length})
                      </span>
                    </button>

                    {/* Right side: Category assignee management */}
                    <div className="flex items-center gap-2">
                      {/* Show category assignees as badges */}
                      {category.assigneeIds.length > 0 && (
                        <div className="flex gap-1.5">
                          {category.assigneeIds.map((assigneeId) => {
                            const assignee = assignees.find((a) => a.id === assigneeId);
                            return assignee ? (
                              <span
                                key={assignee.id}
                                className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-purple-200/60 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 backdrop-blur-sm border border-purple-300/30 shadow-sm"
                                title="Default assignee for this category"
                              >
                                {assignee.name}
                              </span>
                            ) : null;
                          })}
                    </div>
                      )}
                      
                      {/* Button to manage category assignees - shows on hover or when assignees exist */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            // Stop event from bubbling to the category toggle button
                            e.stopPropagation();
                            
                            // STATE UPDATE: Toggle assignee selector for this category
                            const button = e.currentTarget;
                            const rect = button.getBoundingClientRect();
                            
                            // Calculate position - dropdown should appear right below the button
                            const dropdownWidth = 224; // w-56 = 224px
                            let left = rect.left + window.scrollX; // Add scroll offset for absolute positioning
                            const top = rect.bottom + window.scrollY + 4; // Add scroll offset for absolute positioning
                            
                            // Ensure dropdown doesn't go off-screen to the right
                            if (rect.left + dropdownWidth > window.innerWidth) {
                              left = window.innerWidth - dropdownWidth - 8 + window.scrollX;
                            }
                            
                            setDropdownPosition({ top, left });
                            setOpenCategoryAssigneeSelector(
                              openCategoryAssigneeSelector === category.id ? null : category.id
                            );
                          }}
                          className={`px-2 py-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 hover:bg-white/50 dark:hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-300 border border-transparent hover:border-white/30 ${
                            category.assigneeIds.length === 0 ? "opacity-0 group-hover:opacity-100" : ""
                          }`}
                          aria-label="Manage category default assignees"
                          title="Set default assignees for all chores in this category"
                        >
                          👤
                  </button>

                        {/* Category assignee selector dropdown */}
                        {isMounted && openCategoryAssigneeSelector === category.id && dropdownPosition && createPortal(
                          <div
                            className="absolute z-[9999] w-56 backdrop-blur-xl bg-white/80 dark:bg-purple-950/80 border border-white/30 rounded-2xl shadow-glass-strong p-3 transition-all duration-300"
                            style={{
                              top: `${dropdownPosition.top}px`,
                              left: `${dropdownPosition.left}px`,
                            }}
                          >
                            <div className="mb-2 pb-2 border-b border-white/20">
                              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Default Assignees
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Chores inherit these unless overridden
                              </p>
                            </div>
                            {assignees.length === 0 ? (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400 p-2">
                                No assignees yet
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {assignees.map((assignee) => {
                                  const isAssigned = category.assigneeIds.includes(assignee.id);
                                  return (
                                    <button
                                      key={assignee.id}
                                      onClick={() => {
                                        // STATE UPDATE: Toggle assignee on this category
                                        handleToggleCategoryAssignee(category.id, assignee.id);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-300 ${
                                        isAssigned
                                          ? "bg-purple-200/60 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 backdrop-blur-sm border border-purple-300/30"
                                          : "hover:bg-white/40 dark:hover:bg-white/10 text-black dark:text-zinc-50"
                                      }`}
                                    >
                                      {isAssigned ? "✓ " : ""}
                                      {assignee.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>,
                          document.body
                        )}
                      </div>

                      {/* Delete category button - shows on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent category toggle
                          // Confirm deletion
                          if (window.confirm(`Delete "${category.name}" category? All chores in this category will become uncategorized.`)) {
                            handleDeleteCategory(category.id);
                          }
                        }}
                        className="px-2 py-1 text-sm text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100/40 dark:hover:bg-red-950/40 backdrop-blur-sm rounded-lg transition-all duration-300"
                        aria-label="Delete category"
                        title="Delete this category"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Category content - only visible when isOpen is true */}
                  {/* 
                    ACCORDION VISIBILITY LOGIC:
                    - When category.isOpen is true: This div renders, chores are visible
                    - When category.isOpen is false: This div doesn't render (conditional rendering)
                    - Each category's visibility is independent - multiple can be open at once
                    - The chevron rotation and content visibility both depend on the same isOpen state
                  */}
                  {category.isOpen && (
                    <div className="px-4 pb-4">
                      {/* Contextual "+ Add Chore" button for this category */}
                      {addingChoreInCategory !== category.id ? (
                        <button
                          onClick={() => {
                            // Show inline chore creation form for this category
                            setAddingChoreInCategory(category.id);
                            // Close the main add chore form if it's open
                            setIsAddingChore(false);
                          }}
                          className="w-full mb-3 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">+</span>
                          <span>Add chore to {category.name}</span>
                        </button>
                      ) : (
                        /* Inline chore creation form within category */
                        <div className="mb-3 p-3 border-2 border-purple-400/50 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 backdrop-blur-sm">
                          <input
                            type="text"
                            value={newChoreTitleInCategory}
                            onChange={(e) => setNewChoreTitleInCategory(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleAddChoreInCategory(category.id);
                              }
                              if (e.key === "Escape") {
                                setAddingChoreInCategory(null);
                                setNewChoreTitleInCategory("");
                              }
                            }}
                            placeholder={`New chore in ${category.name}...`}
                            autoFocus
                            className="w-full px-3 py-2 mb-2 border border-white/30 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all duration-300 text-sm placeholder:text-purple-400/60"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddChoreInCategory(category.id)}
                              className="flex-1 px-3 py-1.5 bg-purple-600/80 hover:bg-purple-700/90 dark:bg-purple-600/60 dark:hover:bg-purple-700/70 backdrop-blur-sm text-white rounded-xl transition-all duration-300 shadow-glass text-sm font-medium"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setAddingChoreInCategory(null);
                                setNewChoreTitleInCategory("");
                              }}
                              className="px-3 py-1.5 bg-white/30 hover:bg-white/50 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm border border-white/20 text-black dark:text-zinc-50 rounded-xl transition-all duration-300 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {categoryChores.length === 0 && addingChoreInCategory !== category.id && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-3 text-center italic">
                          No chores yet. Click above to add your first chore!
                        </p>
                      )}
                      
                      {categoryChores.length > 0 && (
                      <ul className="space-y-2" role="list">
                        {categoryChores.map((chore) => {
                          // ASSIGNEE INHERITANCE LOGIC:
                          // Get effective assignees for this chore (direct or inherited from category)
                          const { assigneeIds: effectiveAssigneeIds, isInherited } = getEffectiveAssignees(chore);
                          
                          // Convert assignee IDs to assignee objects for display
                          const choreAssignees = assignees.filter((assignee) =>
                            effectiveAssigneeIds.includes(assignee.id)
                          );

                          return (
                            <li
                              key={chore.id}
                              className="group flex flex-col gap-2 p-3 border border-white/20 rounded-xl bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-md"
                            >
                              {/* Main chore row */}
                              <div className="flex items-start gap-3">
                                {/* Checkbox input */}
                                <input
                                  type="checkbox"
                                  id={`chore-${chore.id}`}
                                  checked={chore.completed}
                                  onChange={() => {
                                    handleToggleChore(chore.id);
                                  }}
                                  aria-label={`Mark "${chore.title}" as ${chore.completed ? "incomplete" : "complete"}`}
                                  className="mt-1 w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                                />
                                
                                {/* Chore title label */}
                                <label
                                  htmlFor={`chore-${chore.id}`}
                                  className={`flex-1 cursor-pointer ${
                                    chore.completed
                                      ? "line-through text-zinc-400 dark:text-zinc-500"
                                      : "text-black dark:text-zinc-50"
                                  }`}
                                >
                                  {chore.title}
                                </label>

                                {/* Category selector - shows on hover, allows moving to different category */}
                                {categories.length > 1 && (
                                  <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                                    <select
                                      value={chore.categoryId ?? ""}
                                      onChange={(e) => {
                                        const categoryId = e.target.value === "" ? null : e.target.value;
                                        handleMoveChoreToCategory(chore.id, categoryId);
                                      }}
                                      onClick={(e) => e.stopPropagation()} // Prevent category accordion toggle
                                      className="px-2 py-1 text-xs border border-white/30 rounded-lg bg-white/50 dark:bg-white/10 backdrop-blur-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400/50 cursor-pointer transition-all duration-300"
                                      title="Move to another category"
                                    >
                                      {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                          {cat.id === category.id ? `📁 ${cat.name}` : cat.name}
                                        </option>
                                      ))}
                                      <option value="">Uncategorized</option>
                                    </select>
                                  </div>
                                )}

                                {/* Assignee button and selector - shows on hover */}
                                <div className="relative">
                                  {/* "+" button to open assignee selector - hidden until hover/focus */}
                                  <button
                                    onClick={(e) => {
                                      // STATE UPDATE: Toggle assignee selector for this chore
                                      // If this chore's selector is already open, close it
                                      // Otherwise, open it (and close any other open selector)
                                      const button = e.currentTarget;
                                      const rect = button.getBoundingClientRect();
                                      
                                      // Calculate position - dropdown should appear right below the button
                                      const dropdownWidth = 224; // w-56 = 224px
                                      let left = rect.left + window.scrollX; // Add scroll offset for absolute positioning
                                      const top = rect.bottom + window.scrollY + 4; // Add scroll offset for absolute positioning
                                      
                                      // Ensure dropdown doesn't go off-screen to the right
                                      if (rect.left + dropdownWidth > window.innerWidth) {
                                        left = window.innerWidth - dropdownWidth - 8 + window.scrollX;
                                      }
                                      
                                      setDropdownPosition({ top, left });
                                      setOpenAssigneeSelector(
                                        openAssigneeSelector === chore.id ? null : chore.id
                                      );
                                    }}
                                    className="px-2 py-1 text-sm text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 hover:text-purple-800 dark:hover:text-purple-200 hover:bg-white/50 dark:hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-300 border border-transparent hover:border-white/30"
                                    aria-label="Assign assignees"
                                    title="Assign someone to this chore"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Delete chore button - shows on hover */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    // Confirm deletion
                                    if (window.confirm(`Delete "${chore.title}"?`)) {
                                      handleDeleteChore(chore.id);
                                    }
                                  }}
                                  className="px-2 py-1 text-sm text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100/40 dark:hover:bg-red-950/40 backdrop-blur-sm rounded-lg transition-all duration-300"
                                  aria-label="Delete chore"
                                  title="Delete this chore"
                                >
                                  🗑️
                                </button>
                              </div>

                              {/* Assignee selector dropdown - rendered outside relative container using absolute positioning */}
                              {isMounted && openAssigneeSelector === chore.id && dropdownPosition && createPortal(
                                <div
                                  className="absolute z-[9999] w-56 backdrop-blur-xl bg-white/80 dark:bg-purple-950/80 border border-white/30 rounded-2xl shadow-glass-strong p-2 transition-all duration-300"
                                  style={{
                                    top: `${dropdownPosition.top}px`,
                                    left: `${dropdownPosition.left}px`,
                                  }}
                                >
                                  {/* Quick add assignee form */}
                                  {addingAssigneeInChore === chore.id ? (
                                    <div className="p-2 border-b border-white/20 mb-2">
                                      <input
                                        type="text"
                                        value={newAssigneeNameInChore}
                                        onChange={(e) => setNewAssigneeNameInChore(e.target.value)}
                                        onKeyDown={(e) => {
                                          e.stopPropagation(); // Prevent event from bubbling
                                          if (e.key === "Enter") {
                                            handleQuickAddAssignee(chore.id);
                                          }
                                          if (e.key === "Escape") {
                                            setAddingAssigneeInChore(null);
                                            setNewAssigneeNameInChore("");
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
                                        placeholder="New assignee name..."
                                        autoFocus
                                        className="w-full px-2 py-1 mb-2 text-sm border border-white/30 rounded-lg bg-white/50 dark:bg-white/10 backdrop-blur-md text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all duration-300 placeholder:text-purple-400/60"
                                      />
                                      <div className="flex gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickAddAssignee(chore.id);
                                          }}
                                          className="flex-1 px-2 py-1 text-xs bg-purple-600/80 hover:bg-purple-700/90 dark:bg-purple-600/60 dark:hover:bg-purple-700/70 backdrop-blur-sm text-white rounded-lg transition-all duration-300"
                                        >
                                          Create & Assign
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAddingAssigneeInChore(null);
                                            setNewAssigneeNameInChore("");
                                          }}
                                          className="px-2 py-1 text-xs bg-white/30 hover:bg-white/50 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm border border-white/20 text-black dark:text-zinc-50 rounded-lg transition-all duration-300"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* "Create new" button */
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAddingAssigneeInChore(chore.id);
                                      }}
                                      className="w-full text-left px-3 py-2 mb-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors flex items-center gap-2"
                                    >
                                      <span className="text-lg">+</span>
                                      <span>Create new assignee</span>
                                    </button>
                                  )}

                                  {/* Existing assignees list */}
                                  {assignees.length === 0 && addingAssigneeInChore !== chore.id ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 p-2 text-center italic">
                                      No assignees yet
                                    </p>
                                  ) : assignees.length > 0 && (
                                    <div className="space-y-1">
                                      {assignees.map((assignee) => {
                                        const isAssigned = chore.assigneeIds.includes(assignee.id);
                                        return (
                    <button
                                            key={assignee.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // STATE UPDATE: Toggle assignee assignment
                                              // handleToggleAssignee updates the chore's assigneeIds array
                                              // React re-renders and the badge list updates
                                              handleToggleAssignee(chore.id, assignee.id);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-300 ${
                                              isAssigned
                                                ? "bg-purple-200/60 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 backdrop-blur-sm border border-purple-300/30"
                                                : "hover:bg-white/40 dark:hover:bg-white/10 text-black dark:text-zinc-50"
                                            }`}
                                          >
                                            {isAssigned ? "✓ " : ""}
                                            {assignee.name}
                    </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>,
                                document.body
                              )}

                              {/* Assigned assignees as pill badges */}
                              {/* 
                                VISUAL INDICATORS FOR ASSIGNEE INHERITANCE:
                                - Direct assignees: Solid blue badges (bg-blue-100)
                                - Inherited assignees: Lighter purple badges with dotted border (bg-purple-50)
                                - This helps users understand which assignees are explicitly assigned vs inherited
                              */}
                              {choreAssignees.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 ml-8">
                                  {choreAssignees.map((assignee) => (
                                    <span
                                      key={assignee.id}
                                      className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full backdrop-blur-sm shadow-sm ${
                                        isInherited
                                          ? "bg-purple-100/50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-dashed border-purple-300/40"
                                          : "bg-purple-200/60 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 border border-purple-300/30"
                                      }`}
                                      title={isInherited ? `Inherited from "${category.name}" category` : "Directly assigned"}
                                    >
                                      {isInherited && "↓ "}
                                      {assignee.name}
                                    </span>
                                  ))}
                                  {isInherited && (
                                    <span className="text-xs text-purple-600 dark:text-purple-400 italic self-center">
                                      (from category)
                                    </span>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized chores section - default section for chores without a category */}
            {(() => {
              // Filter chores that don't have a categoryId (undefined or null)
              const uncategorizedChores = chores.filter(
                (chore) => !chore.categoryId
              );

              // Don't render the section if there are no uncategorized chores
              if (uncategorizedChores.length === 0) {
                return null;
              }

              return (
                <div className="border border-white/20 rounded-2xl backdrop-blur-md bg-white/50 dark:bg-white/5 overflow-hidden shadow-glass transition-all duration-300 hover:shadow-xl hover:bg-white/60 dark:hover:bg-white/10">
                  {/* Uncategorized section header */}
                  <div className="p-4 bg-white/30 dark:bg-white/10 hover:bg-white/40 dark:hover:bg-white/15 transition-all duration-300 rounded-t-2xl">
                    <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                      Uncategorized
                      <span className="ml-2 text-sm font-normal text-purple-600 dark:text-purple-400">
                        ({uncategorizedChores.length})
                      </span>
                    </h2>
                  </div>
                  
                  {/* Uncategorized chores list - always visible (no accordion) */}
                  <div className="px-4 pb-4">
                    <ul className="space-y-2" role="list">
                      {uncategorizedChores.map((chore) => {
                        // Get assignee objects for this chore
                        const choreAssignees = assignees.filter((assignee) =>
                          chore.assigneeIds.includes(assignee.id)
                        );

                        return (
                          <li
                            key={chore.id}
                            className="group flex flex-col gap-2 p-3 border border-white/20 rounded-xl bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-md"
                          >
                            {/* Main chore row */}
                            <div className="flex items-start gap-3">
                              {/* Checkbox input */}
                      <input
                        type="checkbox"
                                id={`chore-${chore.id}`}
                                checked={chore.completed}
                                onChange={() => {
                                  handleToggleChore(chore.id);
                                }}
                                aria-label={`Mark "${chore.title}" as ${chore.completed ? "incomplete" : "complete"}`}
                                className="mt-1 w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                              />
                              
                              {/* Chore title label */}
                              <label
                                htmlFor={`chore-${chore.id}`}
                                className={`flex-1 cursor-pointer ${
                                  chore.completed
                                    ? "line-through text-zinc-400 dark:text-zinc-500"
                                    : "text-black dark:text-zinc-50"
                                }`}
                              >
                                {chore.title}
                    </label>

                              {/* Category selector for uncategorized chores - shows on hover */}
                              {categories.length > 0 && (
                                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      const categoryId = e.target.value === "" ? null : e.target.value;
                                      handleMoveChoreToCategory(chore.id, categoryId);
                                    }}
                                    className="px-2 py-1 text-xs border border-white/30 rounded-lg bg-white/50 dark:bg-white/10 backdrop-blur-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400/50 cursor-pointer transition-all duration-300"
                                    title="Move to category"
                                  >
                                    <option value="" disabled>📁 Move to...</option>
                                    {categories.map((category) => (
                                      <option key={category.id} value={category.id}>
                                        {category.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                    
                              {/* Assignee button and selector */}
                              <div className="relative">
                                {/* "+" button to open assignee selector */}
                                <button
                                  onClick={(e) => {
                                    // STATE UPDATE: Toggle assignee selector for this chore
                                    // If this chore's selector is already open, close it
                                    // Otherwise, open it (and close any other open selector)
                                    const button = e.currentTarget;
                                    const rect = button.getBoundingClientRect();
                                    
                                    // Calculate position - dropdown should appear right below the button
                                    const dropdownWidth = 192; // w-48 = 192px
                                    let left = rect.left + window.scrollX; // Add scroll offset for absolute positioning
                                    const top = rect.bottom + window.scrollY + 4; // Add scroll offset for absolute positioning
                                    
                                    // Ensure dropdown doesn't go off-screen to the right
                                    if (rect.left + dropdownWidth > window.innerWidth) {
                                      left = window.innerWidth - dropdownWidth - 8 + window.scrollX;
                                    }
                                    
                                    setDropdownPosition({ top, left });
                                    setOpenAssigneeSelector(
                                      openAssigneeSelector === chore.id ? null : chore.id
                                    );
                                  }}
                                  className="px-2 py-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 hover:bg-white/50 dark:hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-300 border border-transparent hover:border-white/30"
                                  aria-label="Assign assignees"
                                >
                                  +
                                </button>
                              </div>

                              {/* Delete chore button - shows on hover */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Confirm deletion
                                  if (window.confirm(`Delete "${chore.title}"?`)) {
                                    handleDeleteChore(chore.id);
                                  }
                                }}
                                className="px-2 py-1 text-sm text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100/40 dark:hover:bg-red-950/40 backdrop-blur-sm rounded-lg transition-all duration-300"
                                aria-label="Delete chore"
                                title="Delete this chore"
                              >
                                🗑️
                              </button>
                            </div>

                            {/* Assignee selector dropdown - rendered outside relative container using absolute positioning */}
                              {isMounted && openAssigneeSelector === chore.id && dropdownPosition && createPortal(
                                <div
                                  className="absolute z-[9999] w-48 backdrop-blur-xl bg-white/80 dark:bg-purple-950/80 border border-white/30 rounded-2xl shadow-glass-strong p-2 transition-all duration-300"
                                  style={{
                                    top: `${dropdownPosition.top}px`,
                                    left: `${dropdownPosition.left}px`,
                                  }}
                                >
                                    {assignees.length === 0 ? (
                                      <p className="text-sm text-zinc-500 dark:text-zinc-400 p-2">
                                        No assignees yet
                                      </p>
                                    ) : (
                                      <div className="space-y-1">
                                        {assignees.map((assignee) => {
                                          const isAssigned = chore.assigneeIds.includes(assignee.id);
                                          return (
                                            <button
                                              key={assignee.id}
                                              onClick={() => {
                                                // STATE UPDATE: Toggle assignee assignment
                                                // handleToggleAssignee updates the chore's assigneeIds array
                                                // React re-renders and the badge list updates
                                                handleToggleAssignee(chore.id, assignee.id);
                                              }}
                                              className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-300 ${
                                                isAssigned
                                                  ? "bg-purple-200/60 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 backdrop-blur-sm border border-purple-300/30"
                                                  : "hover:bg-white/40 dark:hover:bg-white/10 text-black dark:text-zinc-50"
                                              }`}
                                            >
                                              {isAssigned ? "✓ " : ""}
                                              {assignee.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>,
                                  document.body
                                )}

                            {/* Assigned assignees as pill badges */}
                            {choreAssignees.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 ml-8">
                                {choreAssignees.map((assignee) => (
                                  <span
                                    key={assignee.id}
                                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-purple-200/60 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 backdrop-blur-sm border border-purple-300/30 shadow-sm"
                                  >
                                    {assignee.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })()}
            </div>
          )}
      </main>
    </div>
  );
}
