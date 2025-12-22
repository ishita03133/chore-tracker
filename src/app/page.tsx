"use client"; // This tells Next.js this is a client component (needed for useState and interactivity)

import { useState, useRef, useEffect } from "react"; // Import useState hook to manage component state

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
  // State to store all assignees (people who can do chores)
  // We use an array because we'll have multiple people
  // Starting with an empty array - will be populated later
  const [assignees, setAssignees] = useState<Assignee[]>([]);

  // State to store all categories (groups of related chores)
  // Categories help organize chores (e.g., "Kitchen", "Bathroom")
  // Starting with an empty array - will be populated later
  const [categories, setCategories] = useState<Category[]>([]);

  // State to store all chores (tasks that need to be done)
  // This is the main data we'll be displaying and managing
  // Starting with an empty array - no chores yet
  const [chores, setChores] = useState<Chore[]>([]);
  
  // State to control whether the "add chore" input form is visible
  // When true, the input form is shown; when false, it's hidden
  // This allows us to show/hide the form without losing the input value
  const [isAddingChore, setIsAddingChore] = useState(false);

  // State to store the text the user is typing for a new chore title
  // This is separate from the chores array - it's just temporary input
  const [newChoreTitle, setNewChoreTitle] = useState("");
  
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

  // State to store the position of the dropdown (for fixed positioning)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

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
      categoryId: undefined, // No category assigned - optional field
    };
    
    // Update state: Add the new chore to the array
    // Spread operator (...) copies all existing chores, then adds the new one
    setChores([...chores, newChore]);
    
    // Clear the input field
    setNewChoreTitle("");

    // Hide the input form (it will stay hidden because chores.length > 0 now)
    setIsAddingChore(false);
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
     FUNCTION - Toggle Assignee on Chore
     ============================================
     This function adds or removes an assignee from a chore's assigneeIds array.
     
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
        {/* Page title */}
        <h1 className="text-4xl font-semibold text-black dark:text-zinc-50 mb-8">
          Chore Tracker
        </h1>

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
              }
            }}
                  placeholder="Enter chore title..."
                  autoFocus // Automatically focus the input when it appears
                  className="w-full px-4 py-3 mb-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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

              // Don't render empty categories
              if (categoryChores.length === 0) {
                return null;
              }

              return (
                <div
                  key={category.id}
                  className="border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 overflow-visible"
                >
                  {/* Category header - clickable to toggle accordion */}
                  <button
                    onClick={() => {
                      // STATE UPDATE: When clicked, toggle this category's visibility
                      // Step 1: handleToggleCategory flips isOpen (true ↔ false)
                      // Step 2: React re-renders with new state
                      // Step 3: Chevron rotates and chore list shows/hides
                      handleToggleCategory(category.id);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                    aria-expanded={category.isOpen}
                  >
                    {/* Category name and chore count */}
                    <div className="flex items-center gap-2">
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
                    </div>
                  </button>

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
                      <ul className="space-y-2" role="list">
                        {categoryChores.map((chore) => {
                          // Get assignee objects for this chore
                          const choreAssignees = assignees.filter((assignee) =>
                            chore.assigneeIds.includes(assignee.id)
                          );

                          return (
                            <li
                              key={chore.id}
                              className="flex flex-col gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
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
                            className="flex flex-col gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
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
