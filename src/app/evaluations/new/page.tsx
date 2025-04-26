'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client' // Client-side client

// Define agent type structure
type Agent = {
  id: string;
  name: string;
}

// Define KPI categories
const KPI_CATEGORIES = [
  'Communication',
  'Customer Guideness',
  'Empathy & Tone',
  'Customer Satisfaction',
  'Problem Identification',
  'Resolution Effectiveness',
  'Review Link',
  'Technical Accuracy',
];

export default function NewEvaluationPage() {
  const router = useRouter()
  const supabase = createClient()

  // State for form fields
  const [ticketId, setTicketId] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [manualScore, setManualScore] = useState('')
  const [aiScore, setAiScore] = useState('')
  const [accuracy, setAccuracy] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedKpis, setSelectedKpis] = useState<Set<string>>(new Set())
  
  // State for input validation errors
  const [manualScoreError, setManualScoreError] = useState('')
  const [aiScoreError, setAiScoreError] = useState('')

  // State for agents dropdown
  const [agents, setAgents] = useState<Agent[]>([])

  // State for loading and errors
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch active agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true)
      setFetchError(null)
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'agent')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching agents:', error)
        setFetchError('Could not fetch agents. Please try again.')
        setAgents([])
      } else {
        setAgents(data as Agent[])
      }
      setLoading(false)
    }

    fetchAgents()
  }, [supabase]) // Dependency array includes supabase client instance

  // Validate Manual Score input
  const validateManualScore = (value: string): boolean => {
    if (value === '') {
      setManualScoreError('');
      return true;
    }
    
    const score = Number(value);
    if (isNaN(score)) {
      setManualScoreError('Το σκορ πρέπει να είναι αριθμός');
      return false;
    }
    
    if (score < 1 || score > 5) {
      setManualScoreError('Το σκορ πρέπει να είναι μεταξύ 1 και 5');
      return false;
    }
    
    setManualScoreError('');
    return true;
  };
  
  // Validate AI Score input
  const validateAiScore = (value: string): boolean => {
    if (value === '') {
      setAiScoreError('');
      return true;
    }
    
    const score = Number(value);
    if (isNaN(score)) {
      setAiScoreError('Το σκορ πρέπει να είναι αριθμός');
      return false;
    }
    
    if (score < 1 || score > 5) {
      setAiScoreError('Το σκορ πρέπει να είναι μεταξύ 1 και 5');
      return false;
    }
    
    setAiScoreError('');
    return true;
  };
  
  // Handle Manual Score change
  const handleManualScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setManualScore(value);
    validateManualScore(value);
  };
  
  // Handle AI Score change
  const handleAiScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAiScore(value);
    validateAiScore(value);
  };

  // Calculate Accuracy dynamically (NEW LOGIC)
  useEffect(() => {
    if (manualScore && aiScore) {
      const manualVal = parseFloat(manualScore);
      const aiVal = parseFloat(aiScore);
      
      if (!isNaN(manualVal) && !isNaN(aiVal)) {
        // Calculate percentage match between manual and AI scores
        const percentage = 100 - Math.abs((manualVal - aiVal) / 5 * 100);
        setAccuracy(`${percentage.toFixed(1)}%`);
      } else {
        setAccuracy('');
      }
    } else {
      setAccuracy('');
    }
  }, [manualScore, aiScore]); // Re-calculate whenever manualScore or aiScore changes

  // Handle KPI checkbox changes
  const handleKpiChange = (kpi: string) => {
    setSelectedKpis(prev => {
      const next = new Set(prev)
      if (next.has(kpi)) {
        next.delete(kpi)
      } else {
        next.add(kpi)
      }
      return next
    })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setFormError(null)

    // Validate scores before submission
    const isManualScoreValid = validateManualScore(manualScore);
    const isAiScoreValid = validateAiScore(aiScore);
    
    if (!isManualScoreValid || !isAiScoreValid) {
      setFormError('Παρακαλώ διορθώστε τα σφάλματα στις βαθμολογίες');
      setLoading(false);
      return;
    }

    if (!ticketId || !selectedAgent) {
      setFormError('Ticket ID and Agent are required.')
      setLoading(false)
      return
    }

    // Convert calculated accuracy (0-100) back to 0-1 for DB
    // Ensure accuracy is treated as a number for conversion
    const accuracyNumber = accuracy === '' ? null : Number(accuracy);
    const accuracyDb = accuracyNumber === null ? null : accuracyNumber / 100;

    // Add a check for validity, though it should be implicitly valid if calculated
    if (accuracyDb !== null && (accuracyDb < 0)) { // Allow accuracy potentially > 100%
        setFormError('Calculated accuracy is invalid.');
        setLoading(false);
        return;
    }

    const evaluationData = {
      ticket_id: ticketId,
      agent_id: selectedAgent,
      manual_score: manualScore === '' ? null : Number(manualScore),
      ai_score: aiScore === '' ? null : Number(aiScore),
      accuracy: accuracyDb, // Use the calculated and converted value
      notes: notes.trim() === '' ? null : notes.trim(),
      qa_kpi_category: Array.from(selectedKpis),
    }

    const { error: insertError } = await supabase
      .from('qa_evaluations')
      .insert(evaluationData)

    if (insertError) {
      console.error('Error inserting evaluation:', insertError)
      setFormError(`Failed to save evaluation: ${insertError.message}`)
      setLoading(false)
    } else {
      // Success!
      setLoading(false)
      // Optionally clear form here if staying on page
      // setTicketId(''); setSelectedAgent(''); ... setSelectedKpis(new Set());

      // Redirect to home page and refresh to show the new data
      router.push('/')
      router.refresh()
    }
  }

  // Render form
  return (
    <div className="container mx-auto py-6 max-w-3xl px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Add New QA Evaluation</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ticket Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="ticketId" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Ticket ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ticketId"
                name="ticketId"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                required
                disabled={loading}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="agent" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Agent <span className="text-red-500">*</span>
              </label>
              <select
                id="agent"
                name="agent"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                required
                disabled={loading}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select an agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="manualScore" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Manual Score <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="manualScore"
                name="manualScore"
                min="1"
                max="5"
                step="0.1"
                value={manualScore}
                onChange={handleManualScoreChange}
                placeholder="1.0 - 5.0"
                required
                disabled={loading}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white ${manualScoreError ? 'border-red-500' : ''}`}
              />
              {manualScoreError && (
                <p className="mt-1 text-sm text-red-600">{manualScoreError}</p>
              )}
            </div>
            <div>
              <label htmlFor="aiScore" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                AI Score
              </label>
              <input
                type="number"
                id="aiScore"
                name="aiScore"
                min="1"
                max="5"
                step="0.1"
                value={aiScore}
                onChange={handleAiScoreChange}
                placeholder="1.0 - 5.0"
                disabled={loading}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white ${aiScoreError ? 'border-red-500' : ''}`}
              />
              {aiScoreError && (
                <p className="mt-1 text-sm text-red-600">{aiScoreError}</p>
              )}
            </div>
            <div>
              <label htmlFor="accuracy" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Accuracy (%)
              </label>
              <input
                type="text"
                id="accuracy"
                name="accuracy"
                value={accuracy}
                disabled // Always auto-calculated, not editable by user
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-600 dark:border-gray-600 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Automatically calculated
              </p>
            </div>
          </div>

          {/* KPI Categories */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              QA KPI Categories that needed Adjustments
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {KPI_CATEGORIES.map((kpi) => (
                <div key={kpi} className="flex items-center">
                  <input
                    id={`kpi-${kpi}`}
                    name={`kpi-${kpi}`}
                    type="checkbox"
                    disabled={loading}
                    checked={selectedKpis.has(kpi)}
                    onChange={() => handleKpiChange(kpi)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label
                    htmlFor={`kpi-${kpi}`}
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {kpi}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this evaluation"
              disabled={loading}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Error Message */}
          {formError && (
            <p className="rounded bg-red-100 p-3 text-center text-sm text-red-700 dark:bg-red-900 dark:text-red-200">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              disabled={loading}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-600 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-800 dark:hover:bg-blue-900 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Evaluation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 