'use client'

import Link from 'next/link'
import { toggleUserStatus } from './actions' // Import the action
import { useTransition } from 'react'
// import { toast } from 'sonner'; // Assuming you might add a toast library later

interface UserActionsProps {
  userId: string;
  isActive: boolean;
}

export default function UserActions({ userId, isActive }: UserActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleUserStatus(userId, isActive);
      // Optionally show feedback using a toast notification
      if (result.success) {
        // toast.success(result.message); // Example with react-hot-toast or sonner
        console.log(result.message); 
      } else {
        // toast.error(result.message);
         console.error(result.message);
      }
    });
  };

  return (
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <Link href={`/users/${userId}/edit`} className="text-blue-600 hover:text-blue-900 mr-3">
        Edit
      </Link>
      <button 
        onClick={handleToggle}
        disabled={isPending}
        className={`font-medium ${isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} disabled:opacity-50 disabled:cursor-wait`}
      >
        {isPending ? 'Updating...' : (isActive ? 'Deactivate' : 'Activate')}
      </button>
    </td>
  );
} 