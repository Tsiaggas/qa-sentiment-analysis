'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'
import type { UserWithOptionalTL } from '@/app/users/page' // Reuse user type

// Define the structure for the filters passed back or used internally
export interface MetricsFilterValues {
  agentId?: string | null;
  tlId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface MetricsFiltersProps {
  users: UserWithOptionalTL[]; // Pass all active users
  // No callback needed if we update URL directly
}

export default function MetricsFilters({ users }: MetricsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Separate agents and team leaders
  const agents = users.filter(u => u.role === 'agent');
  const teamLeaders = users.filter(u => u.role === 'tl');

  // State for selected filters
  const [selectedAgent, setSelectedAgent] = useState<string>(searchParams.get('agent') ?? '');
  const [selectedTl, setSelectedTl] = useState<string>(searchParams.get('tl') ?? '');
  const [selectedStartDate, setSelectedStartDate] = useState<string>(searchParams.get('startDate') ?? '');
  const [selectedEndDate, setSelectedEndDate] = useState<string>(searchParams.get('endDate') ?? '');

  // Sync state with URL changes
  useEffect(() => {
    setSelectedAgent(searchParams.get('agent') ?? '');
    setSelectedTl(searchParams.get('tl') ?? '');
    setSelectedStartDate(searchParams.get('startDate') ?? '');
    setSelectedEndDate(searchParams.get('endDate') ?? '');
  }, [searchParams]);

  // Function to update URL search parameters
  const updateSearchParams = useCallback(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    const newParams = new URLSearchParams();

    // Validation: Agent-TL mismatch
    if (selectedAgent && selectedTl) {
        const agentData = users.find(u => u.id === selectedAgent);
        if (agentData && agentData.team_leader_id !== selectedTl) {
          alert('Inconsistency between Agent and Team Leader selection!'); // Error message in Greek
          return; // Stop the update
        }
    }

    // Set parameters only if they have a value
    if (selectedAgent) newParams.set('agent', selectedAgent);
    if (selectedTl) newParams.set('tl', selectedTl);
    if (selectedStartDate) newParams.set('startDate', selectedStartDate);
    if (selectedEndDate) newParams.set('endDate', selectedEndDate);

    const query = newParams.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`);
  }, [
    searchParams, 
    pathname, 
    router, 
    users, 
    selectedAgent, 
    selectedTl, 
    selectedStartDate, 
    selectedEndDate
  ]);

  const clearFilters = () => {
    setSelectedAgent('');
    setSelectedTl('');
    setSelectedStartDate('');
    setSelectedEndDate('');
    router.replace(pathname); // Remove all params from URL
  }

  // Handlers just update local state
  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAgent(e.target.value);
    // If an agent is selected, clear the TL to avoid conflict (optional, but good UX)
    if (e.target.value) {
        setSelectedTl('');
    }
  }

  const handleTlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTl(e.target.value);
     // If a TL is selected, clear the agent to avoid conflict (optional, but good UX)
    if (e.target.value) {
        setSelectedAgent('');
    }
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedStartDate(e.target.value);
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedEndDate(e.target.value);
  }

  return (
    <div className="p-4 bg-gray-50 rounded-md shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {/* Agent Filter */}
        <div>
          <label htmlFor="filter-agent" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            Agent
          </label>
          <select
            id="filter-agent"
            name="agent"
            value={selectedAgent}
            onChange={handleAgentChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
            disabled={!!selectedTl} // Disable if TL is selected
          >
            <option value="">Select Agent</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </div>

        {/* Team Leader Filter */}
        <div>
          <label htmlFor="filter-tl" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            Team Leader
          </label>
          <select
            id="filter-tl"
            name="tl"
            value={selectedTl}
            onChange={handleTlChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
            disabled={!!selectedAgent} // Disable if Agent is selected
          >
            <option value="">Select Team Leader</option>
            {teamLeaders.map(tl => (
              <option key={tl.id} value={tl.id}>{tl.name}</option>
            ))}
          </select>
        </div>

        {/* Start Date Filter */}
        <div>
          <label htmlFor="filter-start-date" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            Start Date
          </label>
          <input
            type="date"
            id="filter-start-date"
            name="startDate"
            value={selectedStartDate}
            onChange={handleStartDateChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            max={selectedEndDate || undefined} // Prevent start date from being after end date
          />
        </div>

        {/* End Date Filter */}
        <div>
          <label htmlFor="filter-end-date" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            End Date
          </label>
          <input
            type="date"
            id="filter-end-date"
            name="endDate"
            value={selectedEndDate}
            onChange={handleEndDateChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            min={selectedStartDate || undefined} // Prevent end date from being before start date
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex justify-end gap-3">
          <button 
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
          >
              Clear Filters
          </button>
          <button 
              type="button"
              onClick={updateSearchParams} 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
              Run Search
          </button>
      </div>
    </div>
  );
} 