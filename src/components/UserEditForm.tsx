'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useState, useEffect } from 'react'
import { updateUser, type UpdateFormState } from '@/app/users/actions' // Import the UPDATE Server Action
import type { User } from '@/app/page' // For TL list
import type { UserWithOptionalTL } from '@/app/users/page' // For user data

interface UserEditFormProps {
  user: UserWithOptionalTL; // Pass the user data to edit
  teamLeaders: User[]; // Pass active TLs for dropdown
}

// Separate component for the submit button
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending} 
      className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus-visible:outline-blue-500"
    >
      {pending ? 'Saving Changes...' : 'Save Changes'}
    </button>
  );
}

export default function UserEditForm({ user, teamLeaders }: UserEditFormProps) {
  const initialState: UpdateFormState = { message: '', errors: {} };
  // Remove the .bind() call, pass the action directly
  // const updateUserWithId = updateUser.bind(null, initialState);
  const [state, formAction] = useActionState(updateUser, initialState);

  // State to track the selected role, initialized from user prop
  const [selectedRole, setSelectedRole] = useState<'agent' | 'tl' | ''>(user.role || '');

  // Initialize TL state if user is an agent
  const [selectedTl, setSelectedTl] = useState<string>(user.role === 'agent' ? (user.team_leader_id || '') : '');

  // Update selected TL when role changes
  useEffect(() => {
      if (selectedRole === 'tl') {
          setSelectedTl(''); // Clear TL if role changes to TL
      } else if (selectedRole === 'agent') {
          // Optionally set a default TL or keep the previous one if applicable
          // For now, just ensure it's ready based on initial user data
          setSelectedTl(user.team_leader_id || ''); 
      }
  }, [selectedRole, user.team_leader_id]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden input for User ID - needed by the action */}
      <input type="hidden" name="id" value={user.id} />
      
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
          Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          defaultValue={user.name ?? ''} // Use defaultValue for edit forms
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-600"
          aria-describedby="name-error"
        />
        {state.errors?.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{state.errors.name.join(', ')}</p>
        )}
      </div>

      {/* Email (Read-only for simplicity) */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
          Email (cannot be changed)
        </label>
        <input
          type="email"
          id="email"
          name="email" // Keep name for validation consistency if schema expects it
          readOnly // Make email read-only
          defaultValue={user.email}
          className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
          aria-describedby="email-error"
        />
         {/* Display email errors if backend validation sends them (e.g., if trying to change) */}
         {state.errors?.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{state.errors.email.join(', ')}</p>
        )}
      </div>

      {/* Password (Optional) */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
          New Password (optional - leave blank to keep current)
        </label>
        <input
          type="password"
          id="password"
          name="password"
          minLength={8}
          placeholder="Enter new password (min 8 chars)"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:border-indigo-600 dark:focus:ring-indigo-600"
          aria-describedby="password-error"
        />
         {state.errors?.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{state.errors.password.join(', ')}</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
          Role <span className="text-red-600">*</span>
        </label>
        <select
          id="role"
          name="role"
          required
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as 'agent' | 'tl')}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-600"
          aria-describedby="role-error"
        >
          <option value="" disabled>Select a Role</option>
          <option value="agent">Agent</option>
          <option value="tl">Team Leader</option>
        </select>
         {state.errors?.role && (
          <p id="role-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{state.errors.role.join(', ')}</p>
        )}
      </div>

      {/* Team Leader (Conditional) */}
      {selectedRole === 'agent' && (
        <div>
          <label htmlFor="team_leader_id" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            Team Leader <span className="text-red-600">*</span>
          </label>
          <select
            id="team_leader_id"
            name="team_leader_id"
            required
            value={selectedTl} // Use state for controlled component
            onChange={(e) => setSelectedTl(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-600 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
            disabled={teamLeaders.length === 0}
            aria-describedby="team_leader_id-error"
          >
            <option value="" disabled>Select a Team Leader</option>
            {teamLeaders.map(tl => (
              <option key={tl.id} value={tl.id}>{tl.name}</option>
            ))}
          </select>
          {teamLeaders.length === 0 && <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">No active Team Leaders found.</p>}
           {state.errors?.team_leader_id && (
             <p id="team_leader_id-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{state.errors.team_leader_id.join(', ')}</p>
           )}
        </div>
      )}

      {/* General Form Error Message */}
       {state.errors?._form && (
        <div className="rounded bg-red-100 p-3 text-center text-sm text-red-700 dark:bg-red-900 dark:text-red-200">
          {state.errors._form.join(', ')}
        </div>
      )}
       {state.message && !state.errors?.name && !state.errors?.email && !state.errors?.password && !state.errors?.role && !state.errors?.team_leader_id && !state.errors?._form && (
         <div className={`rounded p-3 text-center text-sm ${state.message.includes('successfully') ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>
           {state.message}
         </div>
       )}

      <SubmitButton />
    </form>
  )
} 