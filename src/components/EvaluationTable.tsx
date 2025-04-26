import Link from 'next/link';
import type { EvaluationWithAgent } from '@/app/page'; // Import type
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid'; // Simple icons for sorting

interface EvaluationTableProps {
  evaluations: EvaluationWithAgent[];
  currentSort?: string;
  currentOrder?: 'asc' | 'desc';
}

// Helper component for sortable table headers
const SortableHeader = (
    { children, columnId, currentSort, currentOrder }: 
    { children: React.ReactNode, columnId: string, currentSort?: string, currentOrder?: 'asc' | 'desc' }
) => {
    const isSorting = currentSort === columnId;
    const nextOrder = isSorting && currentOrder === 'asc' ? 'desc' : 'asc';
    const href = `?sortBy=${columnId}&order=${nextOrder}`;
    // TODO: Preserve existing filters in href

    return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            <Link href={href} className="group inline-flex items-center">
                {children}
                <span className={`ml-2 flex-none rounded ${isSorting ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 invisible group-hover:visible focus:visible'}`}>
                    {isSorting && currentOrder === 'asc' && <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />}
                    {isSorting && currentOrder === 'desc' && <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />}
                    {!isSorting && <ArrowUpIcon className="h-4 w-4 opacity-50" aria-hidden="true" />}
                </span>
            </Link>
        </th>
    );
};

export default function EvaluationTable({ evaluations, currentSort, currentOrder }: EvaluationTableProps) {
  if (evaluations.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">No evaluations found.</p>;
  }

  return (
    <div className="overflow-x-auto shadow-md sm:rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <SortableHeader columnId="ticket_id" currentSort={currentSort} currentOrder={currentOrder}>Ticket ID</SortableHeader>
            {/* Agent name is not directly sortable this way as it comes from joined table */}
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Agent</th>
            <SortableHeader columnId="manual_score" currentSort={currentSort} currentOrder={currentOrder}>Manual Score</SortableHeader>
            <SortableHeader columnId="ai_score" currentSort={currentSort} currentOrder={currentOrder}>AI Score</SortableHeader>
            <SortableHeader columnId="accuracy" currentSort={currentSort} currentOrder={currentOrder}>Accuracy</SortableHeader>
            {/* KPIs and Notes are generally not sortable */}
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">QA KPI Category that needed Adjustments</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Notes</th>
            <SortableHeader columnId="created_at" currentSort={currentSort} currentOrder={currentOrder}>Date</SortableHeader>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
          {evaluations.map((evaluation) => (
            <tr key={evaluation.id} className="dark:hover:bg-gray-800">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{evaluation.ticket_id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{evaluation.users?.name ?? 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{evaluation.manual_score ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{evaluation.ai_score ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                {evaluation.accuracy !== null ? `${(evaluation.accuracy * 100).toFixed(0)}%` : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {evaluation.qa_kpi_category && evaluation.qa_kpi_category.length > 0
                  ? evaluation.qa_kpi_category.join(', ')
                  : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={evaluation.notes ?? ''}>{evaluation.notes ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {new Date(evaluation.created_at).toLocaleDateString('en-GB')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 