'use client'

import * as XLSX from 'xlsx'; 
import { EvaluationWithAgent } from '@/app/page'; 
import { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/20/solid'; 

// Define an interface for the shape of the exported data
interface ExportDataRow {
  'Ticket ID': string | number;
  'Agent': string;
  'Manual Score': number | string; 
  'QA KPI Category that needed Adjustments': string;
  'Notes': string;
  'Date': string;
}

// Interface for filter values - Allow dates to be string initially
export interface FilterValues {
  startDate?: string | Date | null; // Accept string or Date
  endDate?: string | Date | null; // Accept string or Date
  agentId?: string | null;
  kpiCategory?: string[] | null; // Keep as string array or null
  ticketId?: string | null;
  scoreRange?: string | null;
}

interface ExportButtonProps {
  data: EvaluationWithAgent[];
  filename?: string;
  filters?: FilterValues;
  disabled?: boolean; // Add disabled prop
}

// Helper to safely convert string/Date to Date object
const safeParseDate = (dateInput: string | Date | null | undefined): Date | null => {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    try {
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? null : date;
    } catch (e) {
        return null;
    }
};

export default function ExportButton({ data, filename = 'qa_evaluations', filters, disabled = false }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [loadingGSheet, setLoadingGSheet] = useState(false);

  // Function to generate dynamic filename based on filters
  const generateFilename = (): string => {
    if (!filters) return filename;
    
    const parts: string[] = [filename];
    
    const startDate = safeParseDate(filters.startDate);
    const endDate = safeParseDate(filters.endDate);
    
    // Add date range to filename if both start and end dates are valid Date objects
    if (startDate && endDate) {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      parts.push(`${startDateStr}_to_${endDateStr}`);
    }
    
    // Add agent name to filename if agent filter is set
    if (filters.agentId) {
      // Find the agent by filtering the data for the matching agent ID
      const matchingEvaluation = data.find(item => item.agent_id === filters.agentId);
      if (matchingEvaluation?.users?.name) {
        parts.push(`agent_${matchingEvaluation.users.name.replace(/\s+/g, '_')}`);
      }
    }
    
    // Add KPI category to filename if kpiCategory filter is set
    if (filters.kpiCategory && filters.kpiCategory.length > 0) {
      parts.push(`kpi_${filters.kpiCategory.join('_').replace(/\s+/g, '_')}`);
    }
    
    // Add ticket ID to filename if ticketId filter is set
    if (filters.ticketId) {
      parts.push(`ticket_${filters.ticketId}`);
    }
    
    // Add score range if set
    if (filters.scoreRange) {
        parts.push(`score_${filters.scoreRange}`);
    }
    
    return parts.join('_');
  };

  // Common function to format data for export
  const getFormattedData = (): ExportDataRow[] => {
    return data.map(evaluation => ({
      'Ticket ID': evaluation.ticket_id,
      'Agent': evaluation.users?.name ?? 'N/A',
      'Manual Score': evaluation.manual_score ?? '',
      'QA KPI Category that needed Adjustments': evaluation.qa_kpi_category ? evaluation.qa_kpi_category.join(', ') : '',
      'Notes': evaluation.notes ?? '',
      'Date': new Date(evaluation.created_at).toLocaleDateString('en-GB'),
    }));
  };

  // Common function to calculate average score
  const calculateAverageScore = (): { averageScore: string | number, totalManualScore: number, countValidScores: number } => {
    let totalManualScore = 0;
    let countValidScores = 0;
    
    data.forEach(evaluation => {
      if (evaluation.manual_score !== null && evaluation.manual_score !== undefined && !isNaN(Number(evaluation.manual_score))) {
        totalManualScore += Number(evaluation.manual_score);
        countValidScores++;
      }
    });
    
    const averageScore = countValidScores > 0 ? (totalManualScore / countValidScores).toFixed(2) : 'N/A';
    return { averageScore, totalManualScore, countValidScores };
  };

  const handleExport = () => {
    if (data.length === 0 || disabled) {
      console.log('No data to export or export disabled.');
      return;
    }

    setLoading(true);

    try {
      // Generate dynamic filename based on filters
      const dynamicFilename = generateFilename();
      
      // 1. Format data for export
      const formattedData = getFormattedData();

      // 2. Create worksheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Evaluations');

      // 3. Calculate average Manual Score
      const { averageScore } = calculateAverageScore();
      
      // 4. Add average score row at the bottom
      const lastRowIndex = formattedData.length + 1; // +1 because XLSX is 0-indexed and we need to account for the header row
      
      // Get the cell references
      const avgLabelRef = XLSX.utils.encode_cell({ r: lastRowIndex + 1, c: 0 }); // For "Average:" label
      const avgValueRef = XLSX.utils.encode_cell({ r: lastRowIndex + 1, c: 2 }); // For average value (column C)
      
      // Add cells for average row
      worksheet[avgLabelRef] = { t: 's', v: 'Average Manual Score:' };
      worksheet[avgValueRef] = { t: 'n', v: parseFloat(averageScore.toString()), z: '0.00' }; // Format as number with 2 decimal places
      
      // Adjust the worksheet range to include the average row
      const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
      range.e.r = lastRowIndex + 1; // Extend range to include average row
      worksheet['!ref'] = XLSX.utils.encode_range(range);
      
      // 5. Adjust column widths
      const cols = Object.keys(formattedData[0] || {});
      const colWidths = cols.map(key => {
          const headerWidth = key.length;
          // Use the defined interface for type safety
          const dataWidths = formattedData.map((row: ExportDataRow) => String(row[key as keyof ExportDataRow] ?? '').length);
          const maxWidth = Math.max(headerWidth, ...dataWidths);
          return { wch: maxWidth + 2 }; 
      });
      worksheet['!cols'] = colWidths;
      
      // 6. Apply direct styling to Manual Score cells
      // Find the 'Manual Score' column
      const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
      const manualScoreColIndex = headers.findIndex(header => header === 'Manual Score');
      
      if (manualScoreColIndex !== -1) {
        // Apply styling to each data row
        for (let rowIndex = 1; rowIndex <= formattedData.length; rowIndex++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: manualScoreColIndex });
          const cell = worksheet[cellRef];
          
          if (cell && cell.v !== null && cell.v !== undefined && cell.v !== '') {
            const score = Number(cell.v);
            
            if (!isNaN(score)) {
              // Initialize style object if it doesn't exist
              if (!cell.s) cell.s = {};
              
              // Apply color based on score range
              if (score >= 1.0 && score < 3.0) {
                // Red for 1.0-2.9
                cell.s.font = { color: { rgb: "FF0000" } };
              } else if (score >= 3.0 && score < 4.0) {
                // Orange for 3.0-3.9
                cell.s.font = { color: { rgb: "FFA500" } };
              } else if (score >= 4.0 && score <= 5.0) {
                // Green for 4.0-5.0
                cell.s.font = { color: { rgb: "008000" } };
              }
            }
          }
        }
        
        // Style average score cell if it's a valid number
        if (averageScore !== 'N/A') {
          const avgScoreNum = parseFloat(averageScore.toString());
          
          if (!worksheet[avgValueRef].s) worksheet[avgValueRef].s = {};
          
          if (avgScoreNum >= 1.0 && avgScoreNum < 3.0) {
            worksheet[avgValueRef].s.font = { color: { rgb: "FF0000" } };
          } else if (avgScoreNum >= 3.0 && avgScoreNum < 4.0) {
            worksheet[avgValueRef].s.font = { color: { rgb: "FFA500" } };
          } else if (avgScoreNum >= 4.0 && avgScoreNum <= 5.0) {
            worksheet[avgValueRef].s.font = { color: { rgb: "008000" } };
          }
        }
      }
      
      // 7. Trigger download
      XLSX.writeFile(workbook, `${dynamicFilename}.xlsx`);

    } catch (error) {
      console.error("Error exporting data to Excel:", error);
      alert("An error occurred while exporting the data.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportForGoogleSheets = () => {
    if (data.length === 0 || disabled) {
      console.log('No data to export or export disabled.');
      return;
    }

    setLoadingGSheet(true);

    try {
      // Generate dynamic filename based on filters
      const dynamicFilename = generateFilename();
      
      // 1. Format data for export
      const formattedData = getFormattedData();

      // 2. Create worksheet for CSV export
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Evaluations');

      // 3. Calculate average score
      const { averageScore } = calculateAverageScore();
      
      // 4. Add average score row (simpler format for CSV)
      const lastRowIndex = formattedData.length + 1;
      XLSX.utils.sheet_add_aoa(worksheet, [
        ['Average Manual Score:', '', averageScore, '', '', '']
      ], { origin: { r: lastRowIndex + 1, c: 0 } });
      
      // 5. Export as CSV for Google Sheets
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      
      // 6. Create a download link for the CSV
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dynamicFilename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // 7. Open Google Sheets in a new tab (optional)
      window.open('https://docs.google.com/spreadsheets/u/0/create', '_blank');

    } catch (error) {
      console.error("Error exporting data to CSV:", error);
      alert("An error occurred while exporting the data.");
    } finally {
      setLoadingGSheet(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExport}
        disabled={loading || loadingGSheet || disabled}
        className={`hidden inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Export Excel
          </>
        )}
      </button>
      <button
        onClick={handleExportForGoogleSheets}
        disabled={loading || loadingGSheet || disabled}
        className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loadingGSheet ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Preparing CSV...
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Export CSV (Sheets)
          </>
        )}
      </button>
    </div>
  );
}