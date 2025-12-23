"use client"; // This tells Next.js this is a client component (needed for useState and interactivity)

import { useState, useEffect } from "react"; // Import hooks to manage component state and side effects

/* ============================================
   DATA MODELS - Type Definitions
   ============================================
   These interfaces define the structure of our data.
   TypeScript uses these to ensure we always use the correct data format.
*/

// Assignee represents a person who can be assigned to chores
// Why use an object instead of just a name?
// - IDs allow us to update a person's name without breaking relationships
// - We can add more properties later (email, avatar, etc.) without major refactoring
interface Assignee {
  id: number; // Unique identifier - used to link chores to people
  name: string; // Display name (e.g., "Alice", "Bob", "Roommate 1")
}

// Category groups related chores together (e.g., "Kitchen", "Bathroom", "Outdoor")
// Why structure it this way?
// - isOpen: Allows users to collapse/expand categories for better organization
// - assigneeIds: Lets us filter which people can be assigned to chores in this category
//   (useful for categories like "Kids' Rooms" where only certain people should be assigned)
interface Category {
  id: number; // Unique identifier - used to link chores to categories
  name: string; // Display name (e.g., "Kitchen", "Bathroom", "Weekly Tasks")
  isOpen: boolean; // Whether the category is expanded (true) or collapsed (false) in the UI
  assigneeIds: number[]; // Array of assignee IDs who can be assigned to chores in this category
}

// Chore represents a single task that needs to be done
// Why structure it this way?
// - id: Unique identifier for easy lookup and updates
// - title: Clear, descriptive name (better than "name" for tasks)
// - completed: Simple boolean - either done or not done
// - assigneeIds: Array allows multiple people to be assigned to one chore
//   (e.g., "Deep clean kitchen" might need 2 people working together)
// - categoryId: Optional because not all chores need to belong to a category
//   (Some chores might be one-off tasks that don't fit into a category)
interface Chore {
  id: number; // Unique identifier for each chore
  title: string; // Name/description of the chore (e.g., "Wash dishes", "Take out trash")
  completed: boolean; // Whether the chore has been completed (true) or not (false)
  assigneeIds: number[]; // Array of assignee IDs - allows multiple people per chore
  categoryId?: number; // Optional category ID - some chores don't need categories
}

/* ============================================
   REACT STATE - Data Storage
   ============================================
   useState hooks store our app's data in memory.
   When state changes, React automatically re-renders the component.
*/

export default function Home() {
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
  const [newChoreCategoryId, setNewChoreCategoryId] = useState<number | undefined>(undefined);
  
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
  const [openAssigneeSelector, setOpenAssigneeSelector] = useState<number | null>(null);

  // State to track which category's assignee selector is currently open
  // When set to a category ID, that category's assignee selector is visible
  // When null, no selector is open
  const [openCategoryAssigneeSelector, setOpenCategoryAssigneeSelector] = useState<number | null>(null);

  // State to track which category is currently adding a chore inline
  // When set to a category ID, that category shows an inline chore creation form
  // When null, no inline form is shown
  const [addingChoreInCategory, setAddingChoreInCategory] = useState<number | null>(null);

  // State to store the title for a new chore being added within a category
  const [newChoreTitleInCategory, setNewChoreTitleInCategory] = useState("");

  // State to track if user is adding a new assignee from within a chore's assignee selector
  // When set to a chore ID, that chore's selector shows "add new assignee" form
  // When null, no inline assignee creation is shown
  const [addingAssigneeInChore, setAddingAssigneeInChore] = useState<number | null>(null);

  // State to store the name for a new assignee being created from a chore selector
  const [newAssigneeNameInChore, setNewAssigneeNameInChore] = useState("");

  // State to store the position of the dropdown (for fixed positioning)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

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
  
  // PHASE 1: Load data from localStorage on mount
  useEffect(() => {
    // This runs ONCE after component mounts (client-side only)
    // At this point, hydration is complete, so it's safe to update state
    
    // NOTE: setState in useEffect is intentional here
    // We're synchronizing with localStorage (external system) on initial mount
    // This is the recommended pattern for loading persisted data in React
    
    try {
      // Load chores
      const savedChores = localStorage.getItem('chores');
      if (savedChores) {
        setChores(JSON.parse(savedChores));
      }

      // Load categories
      const savedCategories = localStorage.getItem('categories');
      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      }

      // Load assignees
      const savedAssignees = localStorage.getItem('assignees');
      if (savedAssignees) {
        setAssignees(JSON.parse(savedAssignees));
      }
    } catch (error) {
      // If loading fails (corrupted data, etc.), log error but don't crash
      console.error('Failed to load data from localStorage:', error);
      // App continues with empty arrays (graceful failure)
    }
  }, []); // Empty array = run once on mount, never again

  /* ============================================
     LOCALSTORAGE PERSISTENCE - AUTO SAVE
     ============================================
     
     AUTOMATIC SAVING:
     Whenever chores, categories, or assignees change, save to localStorage.
     This ensures data persists across page refreshes.
     
     HOW IT WORKS:
     1. User adds/edits/deletes a chore
     2. State updates (setChores called)
     3. React re-renders the component
     4. useEffect detects chores changed (dependency array)
     5. Automatically saves to localStorage
     
     DEPENDENCY ARRAYS EXPLAINED:
     - [chores] means "run this effect whenever chores changes"
     - We need 3 separate useEffects (one for each data type)
     - This way we only save what actually changed
     
     NOTE: These also run on initial load (when we set data from localStorage)
     That's OK - we're just saving the data we just loaded (harmless)
  */
  
  // PHASE 2: Save chores whenever they change
  useEffect(() => {
    try {
      // Convert chores array to JSON string and save to localStorage
      localStorage.setItem('chores', JSON.stringify(chores));
    } catch (error) {
      // localStorage can fail (quota exceeded, private browsing, etc.)
      console.error('Failed to save chores to localStorage:', error);
    }
  }, [chores]); // Runs whenever chores array changes

  // Save categories whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('categories', JSON.stringify(categories));
    } catch (error) {
      console.error('Failed to save categories to localStorage:', error);
    }
  }, [categories]); // Runs whenever categories array changes

  // Save assignees whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('assignees', JSON.stringify(assignees));
    } catch (error) {
      console.error('Failed to save assignees to localStorage:', error);
    }
  }, [assignees]); // Runs whenever assignees array changes

  // Close dropdowns when clicking outside
  // This improves UX by automatically closing selectors when user clicks elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenAssigneeSelector(null);
      setOpenCategoryAssigneeSelector(null);
      setAddingAssigneeInChore(null);
      setNewAssigneeNameInChore("");
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
  const handleAddChore = () => {
    // Don't add empty chores - check if there's actual text
    if (newChoreTitle.trim() === "") {
      return; // Exit early if input is empty
    }
    
    // Create a new chore object with all required properties
    const newChore: Chore = {
      id: Date.now(), // Use current timestamp as unique ID (simple approach)
      title: newChoreTitle.trim(), // Remove extra spaces from start/end
      completed: false, // New chores start as not completed
      assigneeIds: [], // No assignees yet - empty array
      categoryId: newChoreCategoryId, // Assign to selected category (or undefined for uncategorized)
    };
    
    // Update state: Add the new chore to the array
    // Spread operator (...) copies all existing chores, then adds the new one
    setChores([...chores, newChore]);
    
    // Clear the input field and category selection
    setNewChoreTitle("");
    setNewChoreCategoryId(undefined);

    // Hide the input form (it will stay hidden because chores.length > 0 now)
    setIsAddingChore(false);
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
  const handleAddChoreInCategory = (categoryId: number) => {
    // Don't add empty chores
    if (newChoreTitleInCategory.trim() === "") {
      return;
    }

    // Create chore with category pre-assigned
    const newChore: Chore = {
      id: Date.now(),
      title: newChoreTitleInCategory.trim(),
      completed: false,
      assigneeIds: [], // Will inherit from category if category has default assignees
      categoryId: categoryId, // Pre-assigned to this category
    };

    // Add to chores array
    setChores([...chores, newChore]);

    // Clear input and hide form
    setNewChoreTitleInCategory("");
    setAddingChoreInCategory(null);
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
  const handleQuickAddAssignee = (choreId: number) => {
    // Don't add empty assignees
    if (newAssigneeNameInChore.trim() === "") {
      return;
    }

    // Check for duplicate names
    const nameExists = assignees.some(
      (assignee) => assignee.name.toLowerCase() === newAssigneeNameInChore.trim().toLowerCase()
    );
    if (nameExists) {
      return; // Exit if name already exists
    }

    // Create new assignee
    const newAssignee: Assignee = {
      id: Date.now(),
      name: newAssigneeNameInChore.trim(),
    };

    // Add to assignees array
    setAssignees([...assignees, newAssignee]);

    // Automatically assign to the current chore
    setChores(
      chores.map((chore) => {
        if (chore.id === choreId) {
          return {
            ...chore,
            assigneeIds: [...chore.assigneeIds, newAssignee.id],
          };
        }
        return chore;
      })
    );

    // Clear input and hide form
    setNewAssigneeNameInChore("");
    setAddingAssigneeInChore(null);
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
  const handleToggleChore = (choreId: number) => {
    // Update the chores array by mapping over each chore
    setChores(
      chores.map((chore) => {
        // If this is the chore we want to toggle
        if (chore.id === choreId) {
          // Return a new chore object with toggled completed status
          // Spread operator (...) copies all existing properties
          // Then we override just the completed property
          return {
            ...chore,
            completed: !chore.completed, // Toggle: true becomes false, false becomes true
          };
        }
        // Return unchanged chore if ID doesn't match
        return chore;
      })
    );
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
  const handleAddAssignee = () => {
    // Don't add empty assignees - check if there's actual text
    if (newAssigneeName.trim() === "") {
      return; // Exit early if input is empty
    }

    // Check for duplicate names (optional - prevents confusion)
    const nameExists = assignees.some(
      (assignee) => assignee.name.toLowerCase() === newAssigneeName.trim().toLowerCase()
    );
    if (nameExists) {
      // Could show an error message here, but keeping it simple for now
      return; // Exit early if name already exists
    }

    // Create a new assignee object with all required properties
    const newAssignee: Assignee = {
      id: Date.now(), // Use current timestamp as unique ID (simple approach)
      name: newAssigneeName.trim(), // Remove extra spaces from start/end
    };

    // Update state: Add the new assignee to the array
    // Spread operator (...) copies all existing assignees, then adds the new one
    setAssignees([...assignees, newAssignee]);

    // Clear the input field
    setNewAssigneeName("");

    // Hide the input form
    setIsAddingAssignee(false);
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
  const handleAddCategory = () => {
    // Don't add empty categories - check if there's actual text
    if (newCategoryName.trim() === "") {
      return; // Exit early if input is empty
    }

    // Create a new category object with all required properties
    const newCategory: Category = {
      id: Date.now(), // Use current timestamp as unique ID (simple approach)
      name: newCategoryName.trim(), // Remove extra spaces from start/end
      isOpen: true, // New categories start as open (expanded) by default
      assigneeIds: [], // No assignee restrictions yet - empty array
    };

    // Update state: Add the new category to the array
    // Spread operator (...) copies all existing categories, then adds the new one
    setCategories([...categories, newCategory]);

    // Clear the input field
    setNewCategoryName("");

    // Hide the input form
    setIsAddingCategory(false);
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
  const handleToggleCategoryAssignee = (categoryId: number, assigneeId: number) => {
    // Update the categories array by mapping over each category
    setCategories(
      categories.map((category) => {
        // If this is the category we want to update
        if (category.id === categoryId) {
          // Check if assignee is already assigned to this category
          const isAssigned = category.assigneeIds.includes(assigneeId);
          
          if (isAssigned) {
            // Remove assignee: filter out the assignee ID
            return {
              ...category,
              assigneeIds: category.assigneeIds.filter((id) => id !== assigneeId),
            };
          } else {
            // Add assignee: spread existing IDs and add the new one
            return {
              ...category,
              assigneeIds: [...category.assigneeIds, assigneeId],
            };
          }
        }
        // Return unchanged category if ID doesn't match
        return category;
      })
    );
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
  const getEffectiveAssignees = (chore: Chore): { assigneeIds: number[]; isInherited: boolean } => {
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
  const handleToggleAssignee = (choreId: number, assigneeId: number) => {
    // Update the chores array by mapping over each chore
    setChores(
      chores.map((chore) => {
        // If this is the chore we want to update
        if (chore.id === choreId) {
          // Check if assignee is already assigned
          const isAssigned = chore.assigneeIds.includes(assigneeId);
          
          if (isAssigned) {
            // Remove assignee: filter out the assignee ID
            return {
              ...chore,
              assigneeIds: chore.assigneeIds.filter((id) => id !== assigneeId),
            };
          } else {
            // Add assignee: spread existing IDs and add the new one
            return {
              ...chore,
              assigneeIds: [...chore.assigneeIds, assigneeId],
            };
          }
        }
        // Return unchanged chore if ID doesn't match
        return chore;
      })
    );
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
  const handleDeleteChore = (choreId: number) => {
    // Filter out the chore with the matching ID
    // This creates a new array without that chore
    setChores(chores.filter((chore) => chore.id !== choreId));
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
  const handleDeleteCategory = (categoryId: number) => {
    // Remove the category
    setCategories(categories.filter((category) => category.id !== categoryId));
    
    // Move all chores in this category to uncategorized
    setChores(
      chores.map((chore) => {
        if (chore.categoryId === categoryId) {
          return {
            ...chore,
            categoryId: undefined, // Remove category assignment
          };
        }
        return chore;
      })
    );
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
  const handleMoveChoreToCategory = (choreId: number, categoryId: number | undefined) => {
    // Update the chores array by mapping over each chore
    setChores(
      chores.map((chore) => {
        // If this is the chore we want to move
        if (chore.id === choreId) {
          // Return a new chore object with updated categoryId
          return {
            ...chore,
            categoryId: categoryId, // Set new category (or undefined for uncategorized)
          };
        }
        // Return unchanged chore if ID doesn't match
        return chore;
      })
    );
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
  const handleToggleCategory = (categoryId: number) => {
    // Update the categories array by mapping over each category
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {/* Main content container with centered layout and max width */}
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-start py-16 px-8 bg-white dark:bg-black">
        {/* Header with title and add button */}
        <div className="w-full flex items-center justify-between mb-8">
          {/* Page title */}
          <h1 className="text-4xl font-semibold text-black dark:text-zinc-50">
            Chore Tracker
          </h1>
          
          {/* Add Chore button - only show when chores exist */}
          {chores.length > 0 && !isAddingChore && (
            <button
              onClick={() => {
                // Show the inline input form for adding a new chore
                setIsAddingChore(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              + Add Chore
            </button>
          )}
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
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
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
                  className="w-full px-4 py-3 mb-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Category selector - only show if categories exist */}
          {categories.length > 0 && (
            <select
              value={newChoreCategoryId ?? ""}
              onChange={(e) => {
                // Update selected category (empty string = undefined = uncategorized)
                const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                setNewChoreCategoryId(value);
              }}
              className="w-full px-4 py-3 mb-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
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
                    className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded-lg transition-colors"
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
                  className="w-full px-4 py-3 mb-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Category selector - only show if categories exist */}
                {categories.length > 0 && (
                  <select
                    value={newChoreCategoryId ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                      setNewChoreCategoryId(value);
                    }}
                    className="w-full px-4 py-3 mb-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Add Chore
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingChore(false);
                      setNewChoreTitle("");
                      setNewChoreCategoryId(undefined);
                    }}
                    className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded-lg transition-colors"
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
            <div className="mb-6 p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900">
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
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
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
                      className="flex-1 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={handleAddAssignee}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        // State change: Hide the form and clear input
                        setIsAddingAssignee(false);
                        setNewAssigneeName("");
                      }}
                      className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded-lg transition-colors text-sm"
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
                      className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-black dark:text-zinc-50"
                    >
                      {assignee.name}
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
                  className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded-lg transition-colors text-sm font-medium"
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
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
          <button
                    onClick={() => {
                      // State change: Hide the form and clear input
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                    }}
                    className="px-3 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded-lg transition-colors text-sm"
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
                  className="border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 overflow-visible"
                >
                  {/* Category header - contains toggle button and assignee management */}
                  <div className="group flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
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
                                className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full"
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
                            setDropdownPosition({
                              top: rect.bottom + window.scrollY + 4,
                              right: window.innerWidth - rect.right,
                            });
                            setOpenCategoryAssigneeSelector(
                              openCategoryAssigneeSelector === category.id ? null : category.id
                            );
                          }}
                          className={`px-2 py-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all ${
                            category.assigneeIds.length === 0 ? "opacity-0 group-hover:opacity-100" : ""
                          }`}
                          aria-label="Manage category default assignees"
                          title="Set default assignees for all chores in this category"
                        >
                          👤
                        </button>

                        {/* Category assignee selector dropdown */}
                        {openCategoryAssigneeSelector === category.id && dropdownPosition && (
                          <div
                            className="fixed z-[9999] w-56 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg p-3"
                            style={{
                              top: `${dropdownPosition.top}px`,
                              right: `${dropdownPosition.right}px`,
                            }}
                          >
                            <div className="mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
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
                                      className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                                        isAssigned
                                          ? "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100"
                                          : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-black dark:text-zinc-50"
                                      }`}
                                    >
                                      {isAssigned ? "✓ " : ""}
                                      {assignee.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
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
                        className="px-2 py-1 text-sm text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-all"
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
                        <div className="mb-3 p-3 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950">
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
                            className="w-full px-3 py-2 mb-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddChoreInCategory(category.id)}
                              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setAddingChoreInCategory(null);
                                setNewChoreTitleInCategory("");
                              }}
                              className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded-lg transition-colors text-sm"
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
                              className="group flex flex-col gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
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
                                        const categoryId = e.target.value === "" ? undefined : parseInt(e.target.value);
                                        handleMoveChoreToCategory(chore.id, categoryId);
                                      }}
                                      onClick={(e) => e.stopPropagation()} // Prevent category accordion toggle
                                      className="px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                                      setDropdownPosition({
                                        top: rect.bottom + window.scrollY + 4,
                                        right: window.innerWidth - rect.right,
                                      });
                                      setOpenAssigneeSelector(
                                        openAssigneeSelector === chore.id ? null : chore.id
                                      );
                                    }}
                                    className="px-2 py-1 text-sm text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-black dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all"
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
                                  className="px-2 py-1 text-sm text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-all"
                                  aria-label="Delete chore"
                                  title="Delete this chore"
                                >
                                  🗑️
                                </button>
                              </div>

                              {/* Assignee selector dropdown - rendered outside relative container using fixed positioning */}
                              {openAssigneeSelector === chore.id && dropdownPosition && (
                                <div
                                  className="fixed z-[9999] w-56 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg p-2"
                                  style={{
                                    top: `${dropdownPosition.top}px`,
                                    right: `${dropdownPosition.right}px`,
                                  }}
                                >
                                  {/* Quick add assignee form */}
                                  {addingAssigneeInChore === chore.id ? (
                                    <div className="p-2 border-b border-zinc-200 dark:border-zinc-700 mb-2">
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
                                        className="w-full px-2 py-1 mb-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                      <div className="flex gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickAddAssignee(chore.id);
                                          }}
                                          className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                        >
                                          Create & Assign
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAddingAssigneeInChore(null);
                                            setNewAssigneeNameInChore("");
                                          }}
                                          className="px-2 py-1 text-xs bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded transition-colors"
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
                                            className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                                              isAssigned
                                                ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                                                : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-black dark:text-zinc-50"
                                            }`}
                                          >
                                            {isAssigned ? "✓ " : ""}
                                            {assignee.name}
                    </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
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
                                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                                        isInherited
                                          ? "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-dashed border-purple-300 dark:border-purple-700"
                                          : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
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
                <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 overflow-hidden">
                  {/* Uncategorized section header */}
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800">
                    <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                      Uncategorized
                      <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
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
                            className="group flex flex-col gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
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
                                      const categoryId = e.target.value === "" ? undefined : parseInt(e.target.value);
                                      handleMoveChoreToCategory(chore.id, categoryId);
                                    }}
                                    className="px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                                    setDropdownPosition({
                                      top: rect.bottom + window.scrollY + 4,
                                      right: window.innerWidth - rect.right,
                                    });
                                    setOpenAssigneeSelector(
                                      openAssigneeSelector === chore.id ? null : chore.id
                                    );
                                  }}
                                  className="px-2 py-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
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
                                className="px-2 py-1 text-sm text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-all"
                                aria-label="Delete chore"
                                title="Delete this chore"
                              >
                                🗑️
                              </button>
                            </div>

                            {/* Assignee selector dropdown - rendered outside relative container using fixed positioning */}
                              {openAssigneeSelector === chore.id && dropdownPosition && (
                                <div
                                  className="fixed z-[9999] w-48 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg p-2"
                                  style={{
                                    top: `${dropdownPosition.top}px`,
                                    right: `${dropdownPosition.right}px`,
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
                                              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                                                isAssigned
                                                  ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                                                  : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-black dark:text-zinc-50"
                                              }`}
                                            >
                                              {isAssigned ? "✓ " : ""}
                                              {assignee.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}

                            {/* Assigned assignees as pill badges */}
                            {choreAssignees.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 ml-8">
                                {choreAssignees.map((assignee) => (
                                  <span
                                    key={assignee.id}
                                    className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
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
