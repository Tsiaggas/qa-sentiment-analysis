'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SentimentVisualizer from '@/components/SentimentVisualizer';
import { ReviewWithSentiment, SentimentLabel } from '@/lib/types/sentiment';

/**
 * Σελίδα προβολής όλων των κριτικών πελατών
 * Παρέχει λίστα κριτικών με φίλτρα και οπτικοποίηση συναισθήματος
 */
export default function ReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [reviews, setReviews] = useState<ReviewWithSentiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Φίλτρα αναζήτησης
  const [searchText, setSearchText] = useState('');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<SentimentLabel | null>(null);
  const [showProcessedOnly, setShowProcessedOnly] = useState(false);
  
  const sourcesOptions = [
    { value: 'email', label: 'Email' },
    { value: 'contact_form', label: 'Φόρμα Επικοινωνίας' },
    { value: 'support_ticket', label: 'Αίτημα Υποστήριξης' },
    { value: 'review', label: 'Κριτική Προϊόντος/Υπηρεσίας' },
    { value: 'social_media', label: 'Κοινωνικά Δίκτυα' },
    { value: 'other', label: 'Άλλο' },
  ];
  
  const sentimentOptions = [
    { value: 'Θετικό', label: 'Θετικό' },
    { value: 'Ουδέτερο', label: 'Ουδέτερο' },
    { value: 'Αρνητικό', label: 'Αρνητικό' },
  ];
  
  // Φόρτωση των κριτικών από τη βάση δεδομένων
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();
        
        // Δημιουργία του ερωτήματος SQL
        let query = supabase
          .from('customer_reviews')
          .select(`
            *,
            sentiment_analysis (*)
          `)
          .order('created_at', { ascending: false });
        
        // Εφαρμογή φίλτρων
        if (searchText) {
          query = query.ilike('content', `%${searchText}%`);
        }
        
        if (selectedSource) {
          query = query.eq('source', selectedSource);
        }
        
        if (showProcessedOnly) {
          query = query.eq('processed', true);
        }
        
        if (selectedSentiment) {
          query = query.not('sentiment_analysis', 'is', null)
                      .eq('sentiment_analysis.sentiment_label', selectedSentiment);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        setReviews(data as ReviewWithSentiment[] || []);
      } catch (err: any) {
        console.error('Σφάλμα κατά τη φόρτωση των κριτικών:', err);
        setError(err.message || 'Σφάλμα κατά τη φόρτωση των κριτικών');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReviews();
  }, [searchText, selectedSource, selectedSentiment, showProcessedOnly]);
  
  // Συνάρτηση για την περικοπή μεγάλων κειμένων
  const truncateText = (text: string, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // Συνάρτηση για τη μορφοποίηση ημερομηνιών
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  // Χειρισμός των φίλτρων
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Η αναζήτηση γίνεται αυτόματα μέσω του useEffect
  };
  
  // Καθαρισμός φίλτρων
  const clearFilters = () => {
    setSearchText('');
    setSelectedSource(null);
    setSelectedSentiment(null);
    setShowProcessedOnly(false);
  };
  
  // Ανάλυση συναισθήματος για μη επεξεργασμένες κριτικές
  const analyzeReview = async (reviewId: string) => {
    try {
      // Εύρεση της κριτικής
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return;
      
      // Κλήση του API για ανάλυση
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: review.content,
          reviewId: reviewId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Σφάλμα κατά την ανάλυση του συναισθήματος');
      }
      
      // Ενημέρωση της λίστας κριτικών
      const result = await response.json();
      
      // Ανανέωση της σελίδας για να εμφανιστούν τα νέα δεδομένα
      router.refresh();
    } catch (err: any) {
      console.error('Σφάλμα κατά την ανάλυση:', err);
      setError(err.message || 'Σφάλμα κατά την ανάλυση του συναισθήματος');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Κριτικές Πελατών</h1>
        <Link 
          href="/reviews/new" 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Νέα Κριτική
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Φίλτρα αναζήτησης */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <h2 className="text-lg font-medium mb-3">Φίλτρα</h2>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="searchText" className="block text-sm font-medium text-gray-700 mb-1">
                Αναζήτηση
              </label>
              <input
                type="text"
                id="searchText"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Αναζήτηση στο περιεχόμενο..."
              />
            </div>
            
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                Πηγή
              </label>
              <select
                id="source"
                value={selectedSource || ''}
                onChange={(e) => setSelectedSource(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Όλες οι πηγές</option>
                {sourcesOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="sentiment" className="block text-sm font-medium text-gray-700 mb-1">
                Συναίσθημα
              </label>
              <select
                id="sentiment"
                value={selectedSentiment || ''}
                onChange={(e) => setSelectedSentiment(e.target.value as SentimentLabel || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Όλα τα συναισθήματα</option>
                {sentimentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <div className="flex items-center h-10">
                <input
                  id="processedOnly"
                  type="checkbox"
                  checked={showProcessedOnly}
                  onChange={(e) => setShowProcessedOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="processedOnly" className="ml-2 block text-sm text-gray-700">
                  Μόνο αναλυμένες
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Καθαρισμός
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Εφαρμογή Φίλτρων
            </button>
          </div>
        </form>
      </div>
      
      {/* Λίστα κριτικών */}
      {isLoading ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Φόρτωση κριτικών...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm border">
          <p className="text-gray-500">Δεν βρέθηκαν κριτικές με τα επιλεγμένα κριτήρια.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm text-gray-500">
                        {formatDate(review.created_at)}
                      </span>
                      <span className="ml-3 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {sourcesOptions.find(s => s.value === review.source)?.label || review.source}
                      </span>
                    </div>
                    <Link
                      href={`/reviews/${review.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Προβολή
                    </Link>
                  </div>
                  
                  <p className="text-gray-800 mb-4">{truncateText(review.content)}</p>
                  
                  {review.contact_info && (
                    <p className="text-sm text-gray-500 mt-2">
                      <span className="font-medium">Επικοινωνία:</span> {review.contact_info}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col items-center">
                  {review.sentiment_analysis ? (
                    <SentimentVisualizer
                      sentimentLabel={review.sentiment_analysis.sentiment_label as SentimentLabel}
                      sentimentScore={review.sentiment_analysis.sentiment_score}
                      scores={{
                        negative: review.sentiment_analysis.negative_score,
                        positive: review.sentiment_analysis.positive_score,
                        neutral: review.sentiment_analysis.neutral_score
                      }}
                      size="small"
                    />
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">Δεν έχει αναλυθεί</p>
                      <button
                        onClick={() => analyzeReview(review.id)}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Ανάλυση
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 