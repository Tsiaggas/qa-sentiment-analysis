'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { addUser, type FormState } from '@/app/users/actions' // Import the Server Action
import type { User } from '@/app/page' // Import User type for TL list

interface UserFormProps {
  teamLeaders: User[]; // Pass active TLs as prop
}

// Separate component for the submit button to use useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending} 
      className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Creating User...' : 'Create User'}
    </button>
  );
}

export default function UserForm({ teamLeaders }: UserFormProps) {
  // Initial state for useFormState
  const initialState: FormState = { message: '', errors: {} };
  const [state, formAction] = useFormState(addUser, initialState);

  // State to track the selected role to conditionally show the TL dropdown
  const [selectedRole, setSelectedRole] = useState<'agent' | 'tl' | '' >('');

  return (
    <form action={formAction} className="space-y-6">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          aria-describedby="name-error"
        />
        {state.errors?.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600">{state.errors.name.join(', ')}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-600">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          aria-describedby="email-error"
        />
        {state.errors?.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600">{state.errors.email.join(', ')}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password <span className="text-red-600">*</span>
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          minLength={8}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          aria-describedby="password-error"
        />
         {state.errors?.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600">{state.errors.password.join(', ')}</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
          Role <span className="text-red-600">*</span>
        </label>
        <select
          id="role"
          name="role"
          required
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as 'agent' | 'tl')}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          aria-describedby="role-error"
        >
          <option value="" disabled>Select a Role</option>
          <option value="agent">Agent</option>
          <option value="tl">Team Leader</option>
        </select>
         {state.errors?.role && (
          <p id="role-error" className="mt-1 text-sm text-red-600">{state.errors.role.join(', ')}</p>
        )}
      </div>

      {/* Team Leader (Conditional) */}
      {selectedRole === 'agent' && (
        <div>
          <label htmlFor="team_leader_id" className="block text-sm font-medium text-gray-700 mb-1">
            Team Leader <span className="text-red-600">*</span>
          </label>
          <select
            id="team_leader_id"
            name="team_leader_id"
            required // Required only if role is agent, validation handled by Server Action
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
            disabled={teamLeaders.length === 0}
            aria-describedby="team_leader_id-error"
          >
            <option value="" disabled>Select a Team Leader</option>
            {teamLeaders.map(tl => (
              <option key={tl.id} value={tl.id}>{tl.name}</option>
            ))}
          </select>
          {teamLeaders.length === 0 && <p className="text-sm text-gray-500 mt-1">No active Team Leaders found to assign.</p>}
           {state.errors?.team_leader_id && (
             <p id="team_leader_id-error" className="mt-1 text-sm text-red-600">{state.errors.team_leader_id.join(', ')}</p>
           )}
        </div>
      )}

      {/* General Form Error Message */}
       {state.errors?._form && (
        <div className="rounded bg-red-100 p-3 text-center text-sm text-red-700">
          {state.errors._form.join(', ')}
        </div>
      )}
       {/* Display non-field specific success/error message if no field errors */}
       {state.message && !state.errors?.name && !state.errors?.email && !state.errors?.password && !state.errors?.role && !state.errors?.team_leader_id && !state.errors?._form && (
         <div className={`rounded p-3 text-center text-sm ${state.message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
           {state.message}
         </div>
       )}

      <SubmitButton />
    </form>
  )
} 