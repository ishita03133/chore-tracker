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
            - If false: We would show the list of chores (not implemented yet)
            
            The empty state encourages users to get started by:
            1. Showing a friendly message
            2. Explaining the collaborative purpose
            3. Providing a clear call-to-action button
        */}
        {chores.length === 0 ? (
          /* Empty state - shown when there are no chores */
          <div className="w-full flex flex-col items-center justify-center py-16 px-8">
            {/* Main empty state message */}
            <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4 text-center">
              No chores yet
            </h2>
            
            {/* Subtext encouraging collaboration */}
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-center max-w-md">
              Start tracking your household chores and work together to keep things organized!
            </p>
            
            {/* Primary call-to-action button */}
            {/* Note: This button doesn't do anything yet - it's a placeholder for future functionality */}
            <button
              onClick={() => {
                // Button does nothing yet - functionality will be added later
                console.log("Add chore button clicked - functionality coming soon!");
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Add your first chore
            </button>
          </div>
        ) : (
          /* This section will show the list of chores when they exist */
          /* Not implemented yet - will be added in future updates */
          <div className="w-full">
            <p className="text-zinc-600 dark:text-zinc-400">
              Chores list will appear here (coming soon)
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
