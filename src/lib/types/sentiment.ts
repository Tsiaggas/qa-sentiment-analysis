/**
 * Τύποι δεδομένων σχετικοί με τις κριτικές πελατών και την ανάλυση συναισθημάτων
 */

export type SentimentLabel = 'Αρνητικό' | 'Θετικό' | 'Ουδέτερο';

/**
 * Μορφή κριτικής πελάτη όπως αποθηκεύεται στη βάση δεδομένων
 */
export interface CustomerReview {
  id: string;
  content: string;
  source: string;
  contact_info?: string;
  created_at: string;
  processed: boolean;
}

/**
 * Μορφή ανάλυσης συναισθήματος όπως αποθηκεύεται στη βάση δεδομένων
 */
export interface SentimentAnalysis {
  id: string;
  review_id: string;
  sentiment_label: SentimentLabel;
  sentiment_score: number;
  negative_score: number;
  positive_score: number;
  neutral_score: number;
  comments?: string;
  created_at: string;
}

/**
 * Συνδυασμένη μορφή κριτικής με την ανάλυση συναισθήματός της
 */
export interface ReviewWithSentiment extends CustomerReview {
  sentiment_analysis?: SentimentAnalysis;
}

/**
 * Φίλτρα για την αναζήτηση κριτικών
 */
export interface ReviewFilters {
  startDate?: string;
  endDate?: string;
  sentiment?: SentimentLabel;
  source?: string;
  searchText?: string;
  processed?: boolean;
}

/**
 * Στατιστικά στοιχεία συναισθημάτων
 */
export interface SentimentStats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  averageScore: number;
} 