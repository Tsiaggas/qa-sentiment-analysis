'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'
import type { UserWithOptionalTL } from '@/app/users/page'
import { FilterValues } from './ExportButton'

interface EvaluationFiltersProps {
  users: UserWithOptionalTL[];
  onFiltersApplied?: (filters: FilterValues) => void;
}

export default function EvaluationFilters({ users, onFiltersApplied }: EvaluationFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Extract agents and team leaders from the users prop
  const agents = users.filter(u => u.role === 'agent');
  const teamLeaders = users.filter(u => u.role === 'tl');

  // Internal state to manage dropdown selections before updating URL
  const [selectedAgent, setSelectedAgent] = useState<string>(searchParams.get('agent') ?? '');
  const [selectedTl, setSelectedTl] = useState<string>(searchParams.get('tl') ?? '');
  const [selectedStartDate, setSelectedStartDate] = useState<string>(searchParams.get('startDate') ?? '');
  const [selectedEndDate, setSelectedEndDate] = useState<string>(searchParams.get('endDate') ?? '');
  const [selectedTicketId, setSelectedTicketId] = useState<string>(searchParams.get('ticketId') ?? '');
  const [selectedScoreRange, setSelectedScoreRange] = useState<string>(searchParams.get('scoreRange') ?? '');

  // Sync internal state if URL changes from outside (e.g., back button)
  useEffect(() => {
    setSelectedAgent(searchParams.get('agent') ?? '');
    setSelectedTl(searchParams.get('tl') ?? '');
    setSelectedStartDate(searchParams.get('startDate') ?? '');
    setSelectedEndDate(searchParams.get('endDate') ?? '');
    setSelectedTicketId(searchParams.get('ticketId') ?? '');
    setSelectedScoreRange(searchParams.get('scoreRange') ?? '');
  }, [searchParams]);

  // Function to update search params 
  const updateSearchParams = useCallback(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    // Check for Agent-TL mismatch
    if (selectedAgent && selectedTl) {
      const agentData = users.find(u => u.id === selectedAgent);
      if (agentData && agentData.team_leader_id !== selectedTl) {
        alert('Ασυμφωνία σχέσης Agent και Team Leader!');
        return false; // Indicate there was a problem
      }
    }

    // Build the params to update
    const finalParams: { [key: string]: string } = {};
    
    if (selectedAgent) finalParams.agent = selectedAgent;
    if (selectedTl && !finalParams.agent) finalParams.tl = selectedTl; // Only apply TL if agent isn't set
    if (selectedStartDate) finalParams.startDate = selectedStartDate;
    if (selectedEndDate) finalParams.endDate = selectedEndDate;
    if (selectedTicketId) finalParams.ticketId = selectedTicketId;
    if (selectedScoreRange) finalParams.scoreRange = selectedScoreRange;

    // Preserve sorting params
    const sortBy = current.get('sortBy');
    const order = current.get('order');
    if (sortBy) finalParams.sortBy = sortBy;
    if (order) finalParams.order = order;

    // Create the filter values object for the export button
    const filterValues: FilterValues = {
      agentId: selectedAgent || null,
      startDate: selectedStartDate ? new Date(selectedStartDate) : null,
      endDate: selectedEndDate ? new Date(selectedEndDate) : null,
      ticketId: selectedTicketId || null,
      scoreRange: selectedScoreRange || null,
      kpiCategory: null // We don't have KPI category filtering yet
    };

    // Notify parent component about the applied filters
    if (onFiltersApplied) {
      onFiltersApplied(filterValues);
    }

    // Construct the new search query string
    const newSearch = new URLSearchParams(finalParams).toString();
    const query = newSearch ? `?${newSearch}` : "";
    router.replace(`${pathname}${query}`);
    
    return true; // Indicate success
  }, [
    searchParams, 
    pathname, 
    router, 
    users, 
    selectedAgent, 
    selectedTl, 
    selectedStartDate, 
    selectedEndDate, 
    selectedTicketId,
    selectedScoreRange,
    onFiltersApplied
  ]);

  // Handlers for filter changes (now just update internal state)
  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAgent(e.target.value);
  }

  const handleTlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTl(e.target.value);
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedStartDate(e.target.value);
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedEndDate(e.target.value);
  }
  
  const handleTicketIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTicketId(e.target.value);
  }
  
  const handleScoreRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedScoreRange(e.target.value);
  }

  const clearFilters = () => {
    // Clear internal state
    setSelectedAgent('');
    setSelectedTl('');
    setSelectedStartDate('');
    setSelectedEndDate('');
    setSelectedTicketId('');
    setSelectedScoreRange('');
    
    // Keep sort parameters if they exist
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    const sortBy = current.get('sortBy');
    const order = current.get('order');
    const newParams = new URLSearchParams();
    if (sortBy) newParams.set('sortBy', sortBy);
    if (order) newParams.set('order', order);

    // Create empty filter values for the export button
    const emptyFilters: FilterValues = {
      agentId: null,
      startDate: null,
      endDate: null,
      ticketId: null,
      scoreRange: null,
      kpiCategory: null
    };

    // Notify parent component about cleared filters
    if (onFiltersApplied) {
      onFiltersApplied(emptyFilters);
    }

    const search = newParams.toString();
    const query = search ? `?${search}` : "";
    router.replace(`${pathname}${query}`);
  }

  const handleRunSearch = () => {
    updateSearchParams();
  }

  return (
    <div className="p-4 bg-gray-50 rounded-md shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
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
          >
            <option value="">All Agents</option>
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
          >
            <option value="">All Team Leaders</option>
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
            max={selectedEndDate || undefined}
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
            min={selectedStartDate || undefined}
          />
        </div>
        
        {/* Ticket ID Filter */}
        <div>
          <label htmlFor="filter-ticket-id" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            Ticket ID
          </label>
          <input
            type="text"
            id="filter-ticket-id"
            name="ticketId"
            value={selectedTicketId}
            onChange={handleTicketIdChange}
            placeholder="e.g. 12345"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          />
        </div>
        
        {/* Manual Score Range Filter */}
        <div>
          <label htmlFor="filter-score-range" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            Score Range
          </label>
          <select
            id="filter-score-range"
            name="scoreRange"
            value={selectedScoreRange}
            onChange={handleScoreRangeChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
          >
            <option value="">All Scores</option>
            <option value="low">Low (1.0-2.9)</option>
            <option value="medium">Medium (3.0-3.9)</option>
            <option value="high">High (4.0-5.0)</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 lg:col-span-6">
          {/* Run Search Button */}
          <button
            onClick={handleRunSearch}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Run Search
          </button>
          
          {/* Clear Filters Button */}
          <button
            onClick={clearFilters}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500 dark:focus:ring-gray-500"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
} 