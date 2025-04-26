'use client'

import { createClient } from '@/lib/supabase/client';
// import { cookies } from 'next/headers'; // Removed unused import
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
// Import the actual components
import EvaluationFilters from '@/components/EvaluationFilters';
import EvaluationTable from '@/components/EvaluationTable';
import ExportButton from '@/components/ExportButton';
import { FilterValues } from '@/components/ExportButton';
// Use the more complete user type
import type { UserWithOptionalTL } from './users/page';

// Define the structure for users (agents/TLs)
export type User = {
  id: string;
  name: string | null;
  role: 'agent' | 'tl';
};

// Define the structure for evaluations, adjusted based on previous findings
export type EvaluationWithAgent = {
  id: string;
  ticket_id: string;
  agent_id: string;
  manual_score: number | null;
  ai_score: number | null;
  qa_kpi_category: string[] | null;
  accuracy: number | null;
  notes: string | null;
  created_at: string;
  users: { name: string | null; team_leader_id: string | null; } | null;
};

// Define the expected structure of searchParams for type safety
interface HomePageSearchParams {
  agent?: string;
  tl?: string;
  startDate?: string;
  endDate?: string;
  ticketId?: string; // Added ticketId based on usage
  scoreRange?: string; // Added scoreRange based on usage
  sortBy?: string; // e.g., 'created_at', 'manual_score'
  order?: 'asc' | 'desc';
}

// Utility function to check if any relevant filters are active
const hasActiveFilters = (params: URLSearchParams): boolean => {
  const relevantKeys: (keyof HomePageSearchParams)[] = ['agent', 'tl', 'startDate', 'endDate', 'ticketId', 'scoreRange'];
  return relevantKeys.some(key => params.has(key) && params.get(key) !== '');
};

// Move from Server Component to Client Component for state management
export default function HomePage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Check if filters were present on initial load or applied later
  const initialFiltersPresent = hasActiveFilters(searchParams);

  // State for evaluations and users
  const [evaluations, setEvaluations] = useState<EvaluationWithAgent[]>([]);
  // Start loading only if filters are present initially
  const [isLoading, setIsLoading] = useState(initialFiltersPresent);
  // State to track if a search/fetch has been attempted
  const [hasSearched, setHasSearched] = useState(initialFiltersPresent);
  const [allUsers, setAllUsers] = useState<UserWithOptionalTL[]>([]);

  // State for applied filters (to pass to ExportButton)
  const [activeFilters, setActiveFilters] = useState<FilterValues>({
    startDate: searchParams.get('startDate') || null,
    endDate: searchParams.get('endDate') || null,
    agentId: searchParams.get('agent') || null,
    // kpiCategory: null, // KPI filter not implemented yet
    ticketId: searchParams.get('ticketId') || null,
    scoreRange: searchParams.get('scoreRange') || null,
  });

  // Fetch data based on search params
  useEffect(() => {
    // Only fetch if relevant filters are present in the URL
    if (!hasActiveFilters(searchParams)) {
      setEvaluations([]); // Clear evaluations if no filters
      setIsLoading(false); // Ensure loading is false
      setHasSearched(false); // Mark that no search has been done
      // Fetch users anyway for the filter dropdowns
      const fetchUsers = async () => {
        try {
          const supabase = createClient();
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, name, role, team_leader_id')
            .eq('is_active', true)
            .order('name');

          if (usersError) {
            console.error('Error fetching users:', usersError);
            return;
          }
          setAllUsers(usersData as unknown as UserWithOptionalTL[]);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
      };
      fetchUsers();
      return; // Stop the effect here if no filters
    }

    // Filters are present, proceed with fetching evaluations
    setHasSearched(true); // Mark that a search is happening
    setIsLoading(true); // Start loading

    const fetchData = async () => {
      try {
        // Create Supabase client (now using the browser client)
        const supabase = createClient();

        // Fetch all users for filters (might already be fetched, but ensures consistency)
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, role, team_leader_id')
          .eq('is_active', true)
          .order('name');

        if (usersError) {
          console.error('Error fetching users:', usersError);
          // Potentially set loading false here? Or let finally handle it.
        } else {
           setAllUsers(usersData as unknown as UserWithOptionalTL[]);
        }


        // Get filters from URL
        const agentParam = searchParams.get('agent');
        const tlParam = searchParams.get('tl');
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const ticketIdParam = searchParams.get('ticketId');
        const scoreRangeParam = searchParams.get('scoreRange');
        const sortByParam = searchParams.get('sortBy') ?? 'created_at';
        const orderParam = searchParams.get('order');

        // Base query
        let query = supabase
          .from('qa_evaluations')
          .select(`
            id, ticket_id, agent_id, manual_score, ai_score, qa_kpi_category,
            accuracy, notes, created_at,
            users!inner ( name, team_leader_id )
          `);

        // Apply agent/tl filter
        if (agentParam) {
          query = query.eq('agent_id', agentParam);
        } else if (tlParam) {
          // Ensure usersData is available before filtering
          const agentIdsForTl = (usersData || [])
            .filter(u => u.role === 'agent' && u.team_leader_id === tlParam)
            .map(u => u.id);

          if (agentIdsForTl.length > 0) {
            query = query.in('agent_id', agentIdsForTl);
          } else {
            // If no agents found for TL, return no results for evaluations
            query = query.eq('agent_id', 'uuid_that_will_not_match'); // Or handle differently
          }
        }

        // Apply ticket ID filter if present
        if (ticketIdParam) {
          query = query.ilike('ticket_id', `%${ticketIdParam}%`);
        }

        // Apply score range filter if present
        if (scoreRangeParam) {
          if (scoreRangeParam === 'low') {
            // Low range: 1.0-2.9
            query = query.gte('manual_score', 1.0).lt('manual_score', 3.0);
          } else if (scoreRangeParam === 'medium') {
            // Medium range: 3.0-3.9
            query = query.gte('manual_score', 3.0).lt('manual_score', 4.0);
          } else if (scoreRangeParam === 'high') {
            // High range: 4.0-5.0
            query = query.gte('manual_score', 4.0).lte('manual_score', 5.0);
          }
        }

        // Apply date filters
        const GREECE_OFFSET_HOURS = 3;

        if (startDateParam) {
          try {
            const startOfDayGreece = new Date(startDateParam + 'T00:00:00.000');
            startOfDayGreece.setUTCHours(startOfDayGreece.getUTCHours() - GREECE_OFFSET_HOURS);
            if (!isNaN(startOfDayGreece.getTime())) {
              query = query.gte('created_at', startOfDayGreece.toISOString());
            }
          } catch (e) {
            console.error("Error processing start date:", e);
          }
        }

        if (endDateParam) {
          try {
            const endOfDayGreece = new Date(endDateParam + 'T23:59:59.999');
            endOfDayGreece.setUTCHours(endOfDayGreece.getUTCHours() - GREECE_OFFSET_HOURS);
            if (!isNaN(endOfDayGreece.getTime())) {
              query = query.lte('created_at', endOfDayGreece.toISOString());
            }
          } catch (e) {
            console.error("Error processing end date:", e);
          }
        }

        // Apply sorting
        const sortBy = sortByParam;
        const orderAsc = orderParam === 'asc';
        const allowedSortColumns = ['created_at', 'manual_score', 'ai_score', 'accuracy', 'ticket_id'];
        const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const sortAscending = sortColumn === sortBy ? orderAsc : false;

        query = query.order(sortColumn, { ascending: sortAscending, nullsFirst: false });

        // Execute the query
        const { data: evaluationsData, error: evaluationsError } = await query;

        if (evaluationsError) {
          console.error('Error fetching evaluations:', evaluationsError);
          // Set evaluations to empty array on error?
          setEvaluations([]);
        } else {
          // Assert the type for compatibility
          setEvaluations(evaluationsData as unknown as EvaluationWithAgent[]);
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        setEvaluations([]); // Clear evaluations on unexpected error
      } finally {
        setIsLoading(false); // Stop loading regardless of outcome
      }
    };

    fetchData();
    // Update active filters state whenever searchParams change
    setActiveFilters({
        startDate: searchParams.get('startDate') || null,
        endDate: searchParams.get('endDate') || null,
        agentId: searchParams.get('agent') || null,
        // kpiCategory: searchParams.get('kpiCategory') || null, // Add if/when implemented
        ticketId: searchParams.get('ticketId') || null,
        scoreRange: searchParams.get('scoreRange') || null,
    });

  }, [searchParams]); // Dependency remains searchParams

  // Handle filter application (potentially just rely on URL changes via EvaluationFilters)
  // const handleFiltersApplied = (filters: FilterValues) => {
  //   setActiveFilters(filters);
  //   // The EvaluationFilters component should already be updating the URL searchParams
  //   // which will trigger the useEffect hook above.
  // };

  // Determine correct order type for EvaluationTable
  const currentOrder = searchParams.get('order');
  const typedOrder = (currentOrder === 'asc' || currentOrder === 'desc') ? currentOrder : undefined;

  return (
    <div className="w-full space-y-6">
      {/* Header section with grouped buttons */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">QA Evaluations</h1>
        {/* Group the Add and Export buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/evaluations/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add New Evaluation
          </Link>
          {/* Pass the current active filters to the ExportButton, disable if no search */}
          <ExportButton data={evaluations} filters={activeFilters} disabled={!hasSearched || evaluations.length === 0}/>
        </div>
      </div>

      {/* Render the Filters Component - Pass the full users list */}
      {/* Removed onFiltersApplied as filters component updates URL directly */}
      <EvaluationFilters users={allUsers} />

      {/* Conditional Rendering Logic */}
      {isLoading ? (
        // 1. Show loading spinner if loading
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : !hasSearched ? (
        // 2. Show prompt message if no search has been attempted
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          Κάντε αναζήτηση χρησιμοποιώντας τα παραπάνω φίλτρα για να δείτε τις κριτικές.
        </p>
      ) : evaluations.length === 0 ? (
        // 3. Show 'no results' message if search attempted but no evaluations found
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          Δεν βρέθηκαν κριτικές που να ταιριάζουν με τα επιλεγμένα κριτήρια.
        </p>
      ) : (
        // 4. Render the Table Component if search attempted and evaluations exist
        <EvaluationTable
          evaluations={evaluations}
          currentSort={searchParams.get('sortBy') || 'created_at'}
          currentOrder={typedOrder}
        />
      )}
    </div>
  );
}
