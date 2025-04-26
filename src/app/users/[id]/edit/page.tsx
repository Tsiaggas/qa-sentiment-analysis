import { createClient } from '@/lib/supabase/server';
// import { cookies } from 'next/headers'; // Removed unused import
import { notFound } from 'next/navigation';
import UserEditForm from '@/components/UserEditForm';
import type { User } from '@/app/page';
import type { UserWithOptionalTL } from '@/app/users/page';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/20/solid';

interface EditUserPageProps {
  params: {
    id: string; // Get the user ID from the route parameter
  };
}

export default async function EditUserPage({ params }: EditUserPageProps) {
    const userId = params.id;
    // const cookieStore = cookies(); // Removed unused variable
    const supabase = createClient();

    // Fetch the specific user to edit
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, team_leader_id, is_active, created_at')
        .eq('id', userId)
        .single(); // Expect only one user
        
    // Fetch active team leaders for the dropdown
    const { data: teamLeadersData, error: tlError } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'tl')
        .eq('is_active', true)
        .order('name');

    // Handle errors fetching data
    if (userError || tlError) {
        console.error('Error fetching data for edit page:', { userError, tlError });
        // If user not found specifically
        if (userError?.code === 'PGRST116') {
            notFound(); // Show 404 page if user doesn't exist
        }
        return <p className="text-red-500">Error loading user data. Please try again.</p>;
    }

    // Ensure userData is not null after check
    if (!userData) {
        notFound();
    }

    // Type assertions
    const user = userData as UserWithOptionalTL;
    const teamLeaders = (teamLeadersData ?? []) as User[];

    return (
        <div className="w-full max-w-lg mx-auto">
             <div className="mb-4">
                 <Link 
                    href="/users" 
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                 >
                     <ChevronLeftIcon className="h-5 w-5 mr-1" />
                     Back to User List
                 </Link>
            </div>
            <h1 className="text-2xl font-semibold mb-6 dark:text-gray-100">Edit User: {user.name ?? user.email}</h1>
            <UserEditForm user={user} teamLeaders={teamLeaders} />
        </div>
    );
} 