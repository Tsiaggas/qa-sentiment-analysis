import { createClient } from '@/lib/supabase/server';
// import { cookies } from 'next/headers'; // Removed unused import
import UserForm from '@/components/UserForm';
import type { User } from '@/app/page'; // Re-use User type
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/20/solid';

export default async function NewUserPage() {
    // const cookieStore = cookies(); // Removed unused variable
    const supabase = createClient();

    // Fetch active team leaders to populate the dropdown in the form
    const { data: teamLeadersData, error } = await supabase
        .from('users')
        .select('id, name') // Only need id and name
        .eq('role', 'tl')
        .eq('is_active', true)
        .order('name');

    if (error) {
        console.error('Error fetching team leaders:', error);
        // You might want to show an error message or prevent form rendering
        return <p className="text-red-500">Error loading necessary data. Please try again.</p>;
    }

    // Type assertion might be needed depending on Supabase client version
    const teamLeaders = (teamLeadersData ?? []) as User[];

    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="mb-4">
                 <Link 
                    href="/users" 
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                 >
                     <ChevronLeftIcon className="h-5 w-5 mr-1" />
                     Back to User List
                 </Link>
            </div>
            <h1 className="text-2xl font-semibold mb-6">Add New User</h1>
            <UserForm teamLeaders={teamLeaders} />
        </div>
    );
} 