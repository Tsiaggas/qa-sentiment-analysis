import { createClient } from '@/lib/supabase/server';
// import { cookies } from 'next/headers'; // Removed unused import
import Link from 'next/link';
import { UserIcon, UserGroupIcon } from '@heroicons/react/24/outline'; // Icons for roles
import UserActions from './UserActions'; // Import the new client component
import { Badge } from '@/components/Badge'; // Correct path to the new Badge component

// Define user type structure more completely for this page
export type UserWithOptionalTL = {
  id: string;
  name: string | null;
  email: string;
  role: 'agent' | 'tl';
  team_leader_id: string | null;
  is_active: boolean;
  created_at: string;
  team_leader_name?: string | null; // Add this field to store the TL name after processing
};

export default async function UsersPage() {
  // const cookieStore = cookies(); // Removed unused variable
  const supabase = createClient();

  // Fetch all users (agents and TLs)
  const { data: usersData, error } = await supabase
    .from('users')
    .select('id, name, email, role, team_leader_id, is_active, created_at')
    .order('name');

  if (error) {
    console.error('Error fetching users:', error);
    return <p className="text-red-500">Error loading users. Check console.</p>;
  }

  // Process users to add team leader names
  const users: UserWithOptionalTL[] = (usersData ?? []).map(user => ({
    ...user,
    email: user.email || 'No Email', // Ensure email is not null
  }));

  const teamLeadersMap = new Map<string, string>();
  users.filter(u => u.role === 'tl').forEach(tl => {
    if (tl.id && tl.name) {
      teamLeadersMap.set(tl.id, tl.name);
    }
  });

  users.forEach(user => {
    if (user.role === 'agent' && user.team_leader_id) {
      user.team_leader_name = teamLeadersMap.get(user.team_leader_id) ?? 'Unknown TL';
    }
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-semibold dark:text-gray-100">User Management</h1>
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
          >
            Back to Evaluations
          </Link>
          <Link
            href="/users/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            Add New User
          </Link>
        </div>
      </div>

      {users.length === 0 ? (
        <p className="text-center text-gray-500">No users found.</p>
      ) : (
        <div className="overflow-x-auto shadow-md sm:rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-gray-500 dark:text-gray-400">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-gray-500 dark:text-gray-400">Team Leader</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">{user.name ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize flex items-center">
                    {user.role === 'agent' ? 
                      <UserIcon className="h-4 w-4 mr-1.5 text-gray-400" /> : 
                      <UserGroupIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                    }
                    <Badge
                      variant={'secondary'}
                      className="capitalize dark:bg-gray-700 dark:text-gray-300"
                    >
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.role === 'agent' ? (user.team_leader_name ?? '-') : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                    <Badge variant={user.is_active ? 'default' : 'outline'} className="dark:bg-opacity-80">
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <UserActions userId={user.id} isActive={user.is_active} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 