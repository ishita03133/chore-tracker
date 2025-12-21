"use client"; // This tells Next.js this is a client component (needed for useState and interactivity)

import { useState } from "react"; // Import useState hook to manage component state

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
             CHORE LIST DISPLAY
             ============================================
             This section renders the list of chores when they exist.
             
             How it works:
             - Uses .map() to loop through the chores array
             - Each chore is rendered as a list item with checkbox and title
             - Checkbox state is controlled by chore.completed
             - Completed chores are styled with line-through and muted colors
             
             Accessibility:
             - Uses semantic <label> element to associate checkbox with text
             - Proper checkbox input with accessible attributes
             - Clear visual feedback for completed state
          */
          <div className="w-full">
            {/* List of chores */}
            <ul className="space-y-3" role="list">
              {chores.map((chore) => (
                <li
                  key={chore.id}
                  className="flex items-start gap-3 p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {/* Checkbox input */}
                  {/* 
                    Accessibility notes:
                    - id is unique for each chore (using chore.id)
                    - checked state is controlled by chore.completed
                    - onChange handler toggles the completion status
                    - aria-label provides context for screen readers
                  */}
                  <input
                    type="checkbox"
                    id={`chore-${chore.id}`}
                    checked={chore.completed}
                    onChange={() => {
                      // State change: Toggle this chore's completed status
                      // handleToggleChore updates the state, React re-renders,
                      // and the checkbox + styling update automatically
                      handleToggleChore(chore.id);
                    }}
                    aria-label={`Mark "${chore.title}" as ${chore.completed ? "incomplete" : "complete"}`}
                    className="mt-1 w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                  />
                  
                  {/* Chore title label */}
                  {/* 
                    Accessibility notes:
                    - htmlFor links the label to the checkbox
                    - Clicking the label text also toggles the checkbox
                    - Conditional styling shows completed state visually
                  */}
                  <label
                    htmlFor={`chore-${chore.id}`}
                    className={`flex-1 cursor-pointer ${
                      chore.completed
                        ? // Completed styling: crossed out and muted colors
                          "line-through text-zinc-400 dark:text-zinc-500"
                        : // Incomplete styling: normal colors
                          "text-black dark:text-zinc-50"
                    }`}
                  >
                    {chore.title}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
