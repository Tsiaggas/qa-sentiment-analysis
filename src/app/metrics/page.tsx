'use client' // Convert to Client Component

import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/20/solid';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Use client
import type { UserWithOptionalTL } from '@/app/users/page'; // User type
import MetricsFilters from '@/components/MetricsFilters'; // Import the new filters
import ReactSpeedometer from "react-d3-speedometer"; // Import the gauge component

// Interface for the fetched evaluation data needed for metrics
interface MetricEvaluationData {
    agent_id: string; // Need agent_id for per-agent stats
    manual_score: number | null;
    qa_kpi_category: string[] | null;
}

// Interface for KPI frequency results
interface KpiFrequency {
    [key: string]: number;
}

// Interface for individual agent metrics when TL is selected
interface AgentMetric {
    id: string;
    name: string | null;
    averageScore: number | null;
    evaluationCount: number;
}

// Utility function to check if relevant metrics filters are active
const hasActiveMetricsFilters = (params: URLSearchParams): boolean => {
  return (params.has('agent') && params.get('agent') !== '') || (params.has('tl') && params.get('tl') !== '');
};

export default function MetricsPage() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [allUsers, setAllUsers] = useState<UserWithOptionalTL[]>([]);
  const [metricsData, setMetricsData] = useState<MetricEvaluationData[]>([]);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [kpiFrequency, setKpiFrequency] = useState<KpiFrequency>({});
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([]); // State for per-agent metrics
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(hasActiveMetricsFilters(searchParams));
  const [targetName, setTargetName] = useState<string | null>(null); // To display Agent/TL name

  // Fetch users once
  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, name, role, team_leader_id, is_active')
                .eq('is_active', true)
                .order('name');
            if (usersError) throw usersError;
            setAllUsers(usersData as UserWithOptionalTL[]);
        } catch (error) {
            console.error('Error fetching users:', error);
            setAllUsers([]);
        }
    };
    fetchUsers();
  }, [supabase]);

  // Fetch and process metrics data when searchParams or users change
  useEffect(() => {
    const agentId = searchParams.get('agent');
    const tlId = searchParams.get('tl');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const shouldFetch = agentId || tlId;
    setHasSearched(!!shouldFetch);

    if (!shouldFetch) {
        setMetricsData([]);
        setAverageScore(null);
        setKpiFrequency({});
        setAgentMetrics([]); // Clear agent metrics
        setIsLoading(false);
        setTargetName(null);
        return;
    }

    setIsLoading(true);
    setTargetName(null);
    setAgentMetrics([]); // Clear previous agent metrics

    const fetchMetricsData = async () => {
      try {
        let agentIdsToFetch: string[] = [];
        let isTlSearch = false;

        if (agentId) {
            agentIdsToFetch = [agentId];
            const agentUser = allUsers.find(u => u.id === agentId);
            setTargetName(agentUser?.name ?? `Agent ID: ${agentId}`);
        } else if (tlId) {
            isTlSearch = true;
            agentIdsToFetch = allUsers
                .filter(u => u.role === 'agent' && u.team_leader_id === tlId)
                .map(u => u.id);
            const tlUser = allUsers.find(u => u.id === tlId);
            setTargetName(tlUser?.name ? `Team: ${tlUser.name}` : `TL ID: ${tlId}`);
             if (agentIdsToFetch.length === 0) {
                 setMetricsData([]);
                 setAverageScore(null);
                 setKpiFrequency({});
                 setAgentMetrics([]);
                 setIsLoading(false);
                 return;
             }
        }
        
        // Base query - Select agent_id as well
        let query = supabase
          .from('qa_evaluations')
          .select('agent_id, manual_score, qa_kpi_category, created_at') // Fetch created_at for filtering
          .in('agent_id', agentIdsToFetch);

        // Apply date filters
        const GREECE_OFFSET_HOURS = 3;
        if (startDate) {
             try {
                const startOfDayGreece = new Date(startDate + 'T00:00:00.000');
                startOfDayGreece.setUTCHours(startOfDayGreece.getUTCHours() - GREECE_OFFSET_HOURS);
                if (!isNaN(startOfDayGreece.getTime())) {
                    query = query.gte('created_at', startOfDayGreece.toISOString());
                }
            } catch (e) { console.error("Error processing start date:", e); }
        }
        if (endDate) {
             try {
                const endOfDayGreece = new Date(endDate + 'T23:59:59.999');
                endOfDayGreece.setUTCHours(endOfDayGreece.getUTCHours() - GREECE_OFFSET_HOURS);
                if (!isNaN(endOfDayGreece.getTime())) {
                    query = query.lte('created_at', endOfDayGreece.toISOString());
                }
            } catch (e) { console.error("Error processing end date:", e); }
        }
        
        // Execute query
        const { data, error } = await query;

        if (error) throw error;
        const fetchedData = data as MetricEvaluationData[];
        setMetricsData(fetchedData);

        // --- Calculate Overall Metrics ---
        let totalScore = 0;
        let scoreCount = 0;
        const kpiCounts: KpiFrequency = {};
        // --- Calculate Per-Agent Metrics (if TL search) ---
        const agentStats: { [id: string]: { name: string | null, totalScore: number, scoreCount: number } } = {};

        fetchedData.forEach(evaluation => {
          // Overall Score
          if (evaluation.manual_score !== null) {
            totalScore += evaluation.manual_score;
            scoreCount++;
          }
          // Overall KPI Frequency
          if (evaluation.qa_kpi_category) {
            evaluation.qa_kpi_category.forEach((kpi: string) => {
              kpiCounts[kpi] = (kpiCounts[kpi] || 0) + 1;
            });
          }

          // Per-Agent Calculation (only if TL search)
          if (isTlSearch) {
              if (!agentStats[evaluation.agent_id]) {
                  const agentUser = allUsers.find(u => u.id === evaluation.agent_id);
                  agentStats[evaluation.agent_id] = { name: agentUser?.name ?? null, totalScore: 0, scoreCount: 0 };
              }
              if (evaluation.manual_score !== null) {
                  agentStats[evaluation.agent_id].totalScore += evaluation.manual_score;
                  agentStats[evaluation.agent_id].scoreCount++;
              }
          }
        });

        setAverageScore(scoreCount > 0 ? totalScore / scoreCount : null);
        setKpiFrequency(kpiCounts);

        // Finalize and set per-agent metrics state if TL search
        if (isTlSearch) {
            const calculatedAgentMetrics = Object.entries(agentStats).map(([id, stats]) => ({
                id,
                name: stats.name,
                averageScore: stats.scoreCount > 0 ? stats.totalScore / stats.scoreCount : null,
                evaluationCount: stats.scoreCount,
            }));
            // Filter out agents with 0 evaluations before setting state
            setAgentMetrics(calculatedAgentMetrics.filter(agent => agent.evaluationCount > 0));
        }

      } catch (error) {
        console.error('Error fetching/processing metrics data:', error);
        setMetricsData([]);
        setAverageScore(null);
        setKpiFrequency({});
        setAgentMetrics([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (allUsers.length > 0) {
        fetchMetricsData();
    } else {
       // If users haven't loaded yet, wait for the other useEffect to trigger this one again.
       // If user fetch failed (allUsers is empty), set loading false.
       const userFetchFailed = !isLoading && allUsers.length === 0; 
       if(userFetchFailed){
            setIsLoading(false);
            setMetricsData([]);
            setAgentMetrics([]);
       }
    }

  }, [searchParams, supabase, allUsers]);

  // Sort KPI frequency for display
  const sortedKpiFrequency = Object.entries(kpiFrequency)
                                  .sort(([, countA], [, countB]) => countB - countA);

  // Sort Agent metrics by average score (desc, nulls last)
  const sortedAgentMetrics = [...agentMetrics].sort((a, b) => {
    if (a.averageScore === null) return 1; // nulls last
    if (b.averageScore === null) return -1; // nulls last
    return b.averageScore - a.averageScore; // higher score first
  });

  // Determine if the current search is for a Team Leader
  const isTlSearchActive = !!searchParams.get('tl');

  return (
    <div className="w-full space-y-6">
        <div className="mb-4 flex justify-between items-center">
             <h1 className="text-2xl font-semibold dark:text-gray-100">Metrics Dashboard</h1>
             <Link 
                href="/" 
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
             >
                 <ChevronLeftIcon className="h-5 w-5 mr-1" />
                 Back to Evaluations
             </Link>
        </div>
        
        <MetricsFilters users={allUsers} />

        {/* Results Area */}
        <div className="mt-6 space-y-6"> {/* Added space-y-6 here */}
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : !hasSearched ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Select an Agent or Team Leader and click 'Run Search' to view metrics.
                </p>
            ) : metricsData.length === 0 && hasSearched ? (
                 <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No evaluation data found for {targetName ?? 'the selected criteria'} within the specified date range.
                </p>
            ) : (
                // Grid for Overall Metrics (Score + KPIs)
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Average Score Display with Gauge */}
                    <div className="p-4 border rounded-lg bg-white shadow dark:bg-gray-800 dark:border-gray-700 flex flex-col items-center">
                        <h2 className="text-lg font-semibold mb-3 dark:text-gray-200 text-center">Average Manual Score {targetName ? `for ${targetName}` : ''}</h2>
                        {averageScore !== null ? (
                            <ReactSpeedometer
                                maxValue={5} // Max score is 5
                                minValue={0} // Min score is 0 (or 1 if scores cant be 0)
                                value={averageScore} // The calculated average
                                // needleColor="#337ab7" // Example needle color (adjust as needed)
                                // startColor="#dc3545" // Example start color (red)
                                // segments={5} // Number of segments for colors
                                // endColor="#28a745" // Example end color (green)
                                customSegmentStops={[0, 1, 2, 3, 4, 5]} // Define stops for colors
                                segmentColors={["#dc3545", "#ffc107", "#ffc107", "#28a745", "#28a745"]} // Red, Orange, Orange, Green, Green
                                // segmentColors={["#dc3545", "#ffc107", "#28a745", "#17a2b8", "#007bff"]} // Example 5 colors
                                needleColor="#555" // Darker needle
                                textColor="#AAA" // Grey text for numbers/value
                                valueTextFontSize="24px"
                                labelFontSize="12px"
                                ringWidth={30}
                                width={280} // Adjust width as needed
                                height={180} // Adjust height as needed
                                currentValueText={`${averageScore.toFixed(2)} / 5.0`} // Display text below
                            />
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 h-[180px] flex items-center justify-center">N/A</p> // Placeholder with similar height
                        )}
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">Based on {metricsData.length} evaluations</p>
                    </div>

                    {/* KPI Frequency Display */}
                    <div className="p-4 border rounded-lg bg-white shadow dark:bg-gray-800 dark:border-gray-700">
                        <h2 className="text-lg font-semibold mb-3 dark:text-gray-200">Most Frequent KPI Adjustments {targetName ? `for ${targetName}` : ''}</h2>
                        {sortedKpiFrequency.length > 0 ? (
                            <ul className="space-y-2">
                                {sortedKpiFrequency.map(([kpi, count]) => (
                                    <li key={kpi} className="flex justify-between items-center text-sm dark:text-gray-300">
                                        <span>{kpi}</span>
                                        <span className="font-medium bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full text-xs">{count} {count === 1 ? 'time' : 'times'}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400">No KPI adjustments recorded for this period.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Agent Ranking Section (Conditionally Rendered) */}
            {isTlSearchActive && !isLoading && sortedAgentMetrics.length > 0 && (
                <div className="p-4 border rounded-lg bg-white shadow dark:bg-gray-800 dark:border-gray-700 mt-6"> {/* Added mt-6 here */}
                    <h2 className="text-lg font-semibold mb-4 dark:text-gray-200">Agent Performance Ranking {targetName ? `for ${targetName}` : ''}</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent Name</th>
                                    <th scope="col" className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Avg. Score</th>
                                    <th scope="col" className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Evaluations</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {sortedAgentMetrics.map((agent, index) => (
                                    <tr key={agent.id} className="dark:hover:bg-gray-700">
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{index + 1}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{agent.name ?? 'Unknown Agent'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                                            {agent.averageScore !== null ? agent.averageScore.toFixed(2) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">{agent.evaluationCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
} 