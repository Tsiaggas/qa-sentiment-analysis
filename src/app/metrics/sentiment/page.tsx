'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SentimentStats } from '@/lib/types/sentiment';

/**
 * Σελίδα με στατιστικά στοιχεία για την ανάλυση συναισθήματος
 * Εμφανίζει γραφήματα και μετρικές σχετικά με τις αναλύσεις συναισθημάτων
 */
export default function SentimentMetricsPage() {
  const [stats, setStats] = useState<SentimentStats | null>(null);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Φόρτωση των στατιστικών στοιχείων από τη βάση δεδομένων
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();
        
        // Στατιστικά στοιχεία συναισθημάτων
        const { data: sentimentData, error: sentimentError } = await supabase
          .from('sentiment_analysis')
          .select('sentiment_label, sentiment_score');
          
        if (sentimentError) throw sentimentError;
        
        // Υπολογισμός των στατιστικών στοιχείων
        const total = sentimentData.length;
        const positive = sentimentData.filter(s => s.sentiment_label === 'Θετικό').length;
        const negative = sentimentData.filter(s => s.sentiment_label === 'Αρνητικό').length;
        const neutral = sentimentData.filter(s => s.sentiment_label === 'Ουδέτερο').length;
        
        const positivePercentage = total > 0 ? (positive / total) * 100 : 0;
        const negativePercentage = total > 0 ? (negative / total) * 100 : 0;
        const neutralPercentage = total > 0 ? (neutral / total) * 100 : 0;
        
        const averageScore = sentimentData.length > 0
          ? sentimentData.reduce((sum, item) => sum + item.sentiment_score, 0) / sentimentData.length
          : 0;
          
        setStats({
          total,
          positive,
          negative,
          neutral,
          positivePercentage,
          negativePercentage,
          neutralPercentage,
          averageScore
        });
        
        // Πρόσφατες κριτικές με την ανάλυση συναισθήματός τους
        const { data: recentData, error: recentError } = await supabase
          .from('customer_reviews')
          .select(`
            id, 
            content, 
            created_at,
            sentiment_analysis (
              sentiment_label, 
              sentiment_score,
              negative_score,
              positive_score,
              neutral_score
            )
          `)
          .eq('processed', true)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (recentError) throw recentError;
        
        setRecentReviews(recentData || []);
      } catch (err: any) {
        console.error('Σφάλμα κατά τη φόρτωση των στατιστικών:', err);
        setError(err.message || 'Σφάλμα κατά τη φόρτωση των στατιστικών');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  // Συνάρτηση για την περικοπή μεγάλων κειμένων
  const truncateText = (text: string, maxLength = 100) => {
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
    }).format(date);
  };
  
  // Συνάρτηση για τη μορφοποίηση ποσοστών
  const formatPercentage = (value: number) => {
    return value.toFixed(1) + '%';
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Στατιστικά Στοιχεία Ανάλυσης Συναισθήματος</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Φόρτωση στατιστικών στοιχείων...</p>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Συνοπτικά στατιστικά στοιχεία */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-medium mb-4">Συνοπτικά Στοιχεία</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Συνολικές Αναλύσεις</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Μέσο Σκορ</p>
                <p className="text-2xl font-bold">{(stats.averageScore * 100).toFixed(1)}%</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Θετικές</p>
                <p className="text-2xl font-bold text-green-600">{stats.positive}</p>
                <p className="text-sm text-gray-500">{formatPercentage(stats.positivePercentage)}</p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-500">Ουδέτερες</p>
                <p className="text-2xl font-bold text-orange-600">{stats.neutral}</p>
                <p className="text-sm text-gray-500">{formatPercentage(stats.neutralPercentage)}</p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-500">Αρνητικές</p>
                <p className="text-2xl font-bold text-red-600">{stats.negative}</p>
                <p className="text-sm text-gray-500">{formatPercentage(stats.negativePercentage)}</p>
              </div>
            </div>
          </div>
          
          {/* Γράφημα κατανομής συναισθημάτων */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-medium mb-4">Κατανομή Συναισθημάτων</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Θετικό</span>
                  <span className="text-sm font-medium text-gray-700">{formatPercentage(stats.positivePercentage)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ width: `${stats.positivePercentage}%` }} 
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Ουδέτερο</span>
                  <span className="text-sm font-medium text-gray-700">{formatPercentage(stats.neutralPercentage)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-orange-400 h-2.5 rounded-full" 
                    style={{ width: `${stats.neutralPercentage}%` }} 
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Αρνητικό</span>
                  <span className="text-sm font-medium text-gray-700">{formatPercentage(stats.negativePercentage)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-red-500 h-2.5 rounded-full" 
                    style={{ width: `${stats.negativePercentage}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Πρόσφατες κριτικές */}
          <div className="bg-white p-6 rounded-lg shadow-sm border md:col-span-2">
            <h2 className="text-lg font-medium mb-4">Πρόσφατες Αναλύσεις</h2>
            
            {recentReviews.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Δεν υπάρχουν αναλυμένες κριτικές.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ημερομηνία
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Κείμενο
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Συναίσθημα
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Σκορ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentReviews.map((review) => (
                      <tr key={review.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(review.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {truncateText(review.content)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${review.sentiment_analysis?.sentiment_label === 'Θετικό' ? 'bg-green-100 text-green-800' : 
                                review.sentiment_analysis?.sentiment_label === 'Αρνητικό' ? 'bg-red-100 text-red-800' : 
                                'bg-orange-100 text-orange-800'}`}
                          >
                            {review.sentiment_analysis?.sentiment_label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(review.sentiment_analysis?.sentiment_score * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm border">
          <p className="text-gray-500">Δεν υπάρχουν διαθέσιμα στατιστικά στοιχεία.</p>
        </div>
      )}
    </div>
  );
} 