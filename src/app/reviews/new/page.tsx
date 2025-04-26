'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { analyzeSentiment } from '@/lib/api/sentiment';
import SentimentVisualizer from '@/components/SentimentVisualizer';

/**
 * Σελίδα για την εισαγωγή νέων κριτικών πελατών
 * Επιτρέπει την εισαγωγή κειμένου, ανάλυση του συναισθήματος και αποθήκευση στη βάση δεδομένων
 */
export default function NewReviewPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [source, setSource] = useState('email');
  const [contactInfo, setContactInfo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentimentResult, setSentimentResult] = useState<any>(null);
  
  // Λίστα πιθανών πηγών
  const sourcesOptions = [
    { value: 'email', label: 'Email' },
    { value: 'contact_form', label: 'Φόρμα Επικοινωνίας' },
    { value: 'support_ticket', label: 'Αίτημα Υποστήριξης' },
    { value: 'review', label: 'Κριτική Προϊόντος/Υπηρεσίας' },
    { value: 'social_media', label: 'Κοινωνικά Δίκτυα' },
    { value: 'other', label: 'Άλλο' },
  ];
  
  // Ανάλυση του συναισθήματος του κειμένου
  const handleAnalyze = async () => {
    if (!content.trim()) {
      setError('Παρακαλώ εισάγετε κείμενο για ανάλυση');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeSentiment(content);
      setSentimentResult(result);
    } catch (err: any) {
      setError(`Σφάλμα κατά την ανάλυση: ${err.message || 'Άγνωστο σφάλμα'}`);
      console.error('Σφάλμα ανάλυσης:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Αποθήκευση της κριτικής και της ανάλυσης στη βάση δεδομένων
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Παρακαλώ εισάγετε κείμενο για την κριτική');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const supabase = createClient();
      
      // Αποθήκευση της κριτικής
      const { data: reviewData, error: reviewError } = await supabase
        .from('customer_reviews')
        .insert({
          content,
          source,
          contact_info: contactInfo,
          processed: !!sentimentResult // Αν έχουμε ήδη ανάλυση, θεωρείται επεξεργασμένη
        })
        .select()
        .single();
      
      if (reviewError) {
        throw new Error(`Σφάλμα κατά την αποθήκευση της κριτικής: ${reviewError.message}`);
      }
      
      // Αν έχουμε ήδη ανάλυση συναισθήματος, την αποθηκεύουμε
      if (sentimentResult) {
        const { error: sentimentError } = await supabase
          .from('sentiment_analysis')
          .insert({
            review_id: reviewData.id,
            sentiment_label: sentimentResult.sentimentLabel,
            sentiment_score: sentimentResult.sentimentScore,
            negative_score: sentimentResult.scores.negative,
            positive_score: sentimentResult.scores.positive,
            neutral_score: sentimentResult.scores.neutral
          });
        
        if (sentimentError) {
          console.error('Σφάλμα κατά την αποθήκευση της ανάλυσης συναισθήματος:', sentimentError);
        }
      }
      
      // Μετάβαση στη λίστα κριτικών
      router.push('/reviews');
    } catch (err: any) {
      setError(err.message || 'Σφάλμα κατά την αποθήκευση');
      console.error('Σφάλμα υποβολής:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Νέα Κριτική Πελάτη</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Κείμενο Κριτικής
          </label>
          <textarea
            id="content"
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Εισάγετε το κείμενο της κριτικής του πελάτη εδώ..."
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
              Πηγή
            </label>
            <select
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sourcesOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-1">
              Στοιχεία Επικοινωνίας (προαιρετικά)
            </label>
            <input
              type="text"
              id="contactInfo"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email ή τηλέφωνο πελάτη"
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !content.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {isAnalyzing ? 'Ανάλυση...' : 'Ανάλυση Συναισθήματος'}
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
          >
            {isSubmitting ? 'Αποθήκευση...' : 'Αποθήκευση Κριτικής'}
          </button>
        </div>
      </form>
      
      {sentimentResult && (
        <div className="mt-8 p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Αποτελέσματα Ανάλυσης</h2>
          <div className="flex flex-col items-center">
            <SentimentVisualizer
              sentimentLabel={sentimentResult.sentimentLabel}
              sentimentScore={sentimentResult.sentimentScore}
              scores={sentimentResult.scores}
              showDetails={true}
              size="large"
            />
          </div>
        </div>
      )}
    </div>
  );
} 