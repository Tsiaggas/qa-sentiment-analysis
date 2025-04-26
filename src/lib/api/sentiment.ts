/**
 * Διεπαφή με το API ανάλυσης συναισθημάτων
 * 
 * Παρέχει συναρτήσεις για την επικοινωνία με το μοντέλο ανάλυσης συναισθημάτων
 * που φιλοξενείται στο Hugging Face
 */

// Τύποι δεδομένων
export type SentimentLabel = 'Αρνητικό' | 'Θετικό' | 'Ουδέτερο';

export interface SentimentScores {
  negative: number;
  positive: number;
  neutral: number;
}

export interface SentimentResult {
  sentimentLabel: SentimentLabel;
  sentimentScore: number;
  scores: SentimentScores;
}

// URL του μοντέλου Hugging Face
const MODEL_URL = 'https://api-inference.huggingface.co/models/tsiaggas/fine-tuned-for-sentiment-3class';

/**
 * Αναλύει το συναίσθημα ενός κειμένου χρησιμοποιώντας το API του Hugging Face
 * 
 * @param text Το κείμενο προς ανάλυση
 * @returns Αποτέλεσμα της ανάλυσης συναισθήματος
 */
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  try {
    // Εναλλακτικά, μπορούμε να χρησιμοποιήσουμε το τοπικό API
    // const response = await fetch('/api/sentiment', {
    const response = await fetch(MODEL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || ''}`,
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      throw new Error(`Σφάλμα API: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Επεξεργασία των αποτελεσμάτων - Μετατροπή από τη μορφή του Hugging Face
    // σε εσωτερική μορφή της εφαρμογής
    const scores = {
      negative: 0,
      positive: 0,
      neutral: 0
    };
    
    let highestScore = -1;
    let predictedLabel: SentimentLabel = 'Ουδέτερο';
    
    // Αντιστοίχιση ετικετών από το μοντέλο
    const labelMap: Record<string, SentimentLabel> = {
      'LABEL_0': 'Αρνητικό',
      'LABEL_1': 'Θετικό',
      'LABEL_2': 'Ουδέτερο'
    };
    
    data[0].forEach((result: any) => {
      const label = labelMap[result.label];
      const score = result.score;
      
      if (label === 'Αρνητικό') scores.negative = score;
      if (label === 'Θετικό') scores.positive = score;
      if (label === 'Ουδέτερο') scores.neutral = score;
      
      if (score > highestScore) {
        highestScore = score;
        predictedLabel = label;
      }
    });
    
    return {
      sentimentLabel: predictedLabel,
      sentimentScore: highestScore,
      scores
    };
  } catch (error) {
    console.error('Σφάλμα κατά την ανάλυση συναισθήματος:', error);
    throw error;
  }
}

/**
 * Αναλύει το συναίσθημα πολλών κειμένων ταυτόχρονα
 * 
 * @param texts Πίνακας κειμένων προς ανάλυση
 * @returns Αποτελέσματα της ανάλυσης συναισθήματος για κάθε κείμενο
 */
export async function analyzeBatchSentiment(texts: string[]): Promise<SentimentResult[]> {
  // Για μικρά batches, μπορούμε να επεξεργαστούμε παράλληλα
  return Promise.all(texts.map(text => analyzeSentiment(text)));
} 