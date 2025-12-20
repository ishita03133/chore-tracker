"use client"; // This tells Next.js this is a client component (needed for useState and interactivity)

import { useState } from "react"; // Import useState hook to manage component state

// Define the structure of a chore
interface Chore {
  id: number; // Unique identifier for each chore
  name: string; // Name/description of the chore
  assignee: string; // Which person is assigned (either "Person 1" or "Person 2")
  completedByPerson1: boolean; // Whether Person 1 has completed it
  completedByPerson2: boolean; // Whether Person 2 has completed it
}

export default function Home() {
  // State to store the list of chores
  // useState returns [currentValue, functionToUpdateValue]
  const [chores, setChores] = useState<Chore[]>([]);
  
  // State to store the input value when adding a new chore
  const [newChoreName, setNewChoreName] = useState("");
  
  // State to track which assignee is selected when adding a new chore
  const [selectedAssignee, setSelectedAssignee] = useState<"Person 1" | "Person 2">("Person 1");

  // Function to add a new chore to the list
  const addChore = () => {
    // Only add if there's a name entered
    if (newChoreName.trim() === "") return;
    
    // Create a new chore object
    const newChore: Chore = {
      id: Date.now(), // Use current timestamp as unique ID
      name: newChoreName,
      assignee: selectedAssignee,
      completedByPerson1: false, // Initially not completed
      completedByPerson2: false,
    };
    
    // Add the new chore to the list using setChores
    // Spread operator (...) copies existing chores and adds the new one
    setChores([...chores, newChore]);
    
    // Clear the input field
    setNewChoreName("");
  };

  // Function to toggle completion status for a specific person and chore
  const toggleCompletion = (choreId: number, person: "Person 1" | "Person 2") => {
    // Update the chores array
    setChores(
      chores.map((chore) => {
        // Find the chore that matches the ID
        if (chore.id === choreId) {
          // Return a new chore object with updated completion status
          return {
            ...chore, // Copy all existing properties
            // Toggle the completion status for the specified person
            completedByPerson1: person === "Person 1" ? !chore.completedByPerson1 : chore.completedByPerson1,
            completedByPerson2: person === "Person 2" ? !chore.completedByPerson2 : chore.completedByPerson2,
          };
        }
        // Return unchanged chore if ID doesn't match
        return chore;
      })
    );
  };

  // Function to delete a chore
  const deleteChore = (choreId: number) => {
    // Filter out the chore with the matching ID
    setChores(chores.filter((chore) => chore.id !== choreId));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-start py-16 px-8 bg-white dark:bg-black">
        {/* Page title */}
        <h1 className="text-4xl font-semibold text-black dark:text-zinc-50 mb-8">
          Chore Tracker - Ishita
        </h1>

        {/* Section to add new chores */}
        <div className="w-full mb-8 px-6 py-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4">
            Add New Chore
          </h2>
          
          {/* Input field for chore name */}
          <input
            type="text"
            value={newChoreName}
            onChange={(e) => setNewChoreName(e.target.value)} // Update state when user types
            placeholder="Enter chore name..."
            className="w-full px-4 py-2 mb-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
            onKeyDown={(e) => {
              // Allow adding chore by pressing Enter key
              if (e.key === "Enter") {
                addChore();
              }
            }}
          />
          
          {/* Radio buttons to select assignee */}
          <div className="mb-4">
            <label className="mr-4 text-black dark:text-zinc-50">
              <input
                type="radio"
                value="Person 1"
                checked={selectedAssignee === "Person 1"}
                onChange={(e) => {
                  if (e.target.value === "Person 1" || e.target.value === "Person 2") {
                    setSelectedAssignee(e.target.value);
                  }
                }}
                className="mr-2"
              />
              Person 1
            </label>
            <label className="text-black dark:text-zinc-50">
              <input
                type="radio"
                value="Person 2"
                checked={selectedAssignee === "Person 2"}
                onChange={(e) => {
                  if (e.target.value === "Person 1" || e.target.value === "Person 2") {
                    setSelectedAssignee(e.target.value);
                  }
                }}
                className="mr-2"
              />
              Person 2
            </label>
          </div>
          
          {/* Button to add the chore */}
          <button
            onClick={addChore} // Call addChore function when clicked
            className="px-6 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(208, 37, 37, 1)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(185, 28, 28, 1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(208, 37, 37, 1)'}
          >
            Add Chore
          </button>
        </div>

        {/* List of chores */}
        <div className="w-full">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4">
            Chores List
          </h2>
          
          {/* Show message if no chores exist */}
          {chores.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">No chores yet. Add one above!</p>
          ) : (
            // Map through chores array and render each one
            <div className="space-y-4">
              {chores.map((chore) => (
                <div
                  key={chore.id} // React needs a unique key for each item in a list
                  className="p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900"
                >
                  {/* Chore name and assignee */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
                        {chore.name}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Assigned to: {chore.assignee}
                      </p>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={() => deleteChore(chore.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                  
                  {/* Completion checkboxes for both people */}
                  <div className="flex gap-6">
                    {/* Person 1 checkbox */}
                    <label className="flex items-center text-black dark:text-zinc-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chore.completedByPerson1}
                        onChange={() => toggleCompletion(chore.id, "Person 1")} // Toggle Person 1's completion
                        className="mr-2 w-4 h-4"
                      />
                      Person 1 {chore.completedByPerson1 ? "✓" : ""}
                    </label>
                    
                    {/* Person 2 checkbox */}
                    <label className="flex items-center text-black dark:text-zinc-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chore.completedByPerson2}
                        onChange={() => toggleCompletion(chore.id, "Person 2")} // Toggle Person 2's completion
                        className="mr-2 w-4 h-4"
                      />
                      Person 2 {chore.completedByPerson2 ? "✓" : ""}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
