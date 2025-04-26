import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeSentiment, analyzeBatchSentiment } from '@/lib/api/sentiment';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sentiment
 * 
 * Δέχεται ένα κείμενο και επιστρέφει την ανάλυση συναισθήματος.
 * Αν παρέχεται reviewId, αποθηκεύει επίσης τα αποτελέσματα στη βάση δεδομένων.
 */
export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { text, reviewId } = json;

    if (!text) {
      return NextResponse.json(
        { error: 'Απαιτείται κείμενο για ανάλυση' },
        { status: 400 }
      );
    }

    // Ανάλυση συναισθήματος
    const result = await analyzeSentiment(text);

    // Αν παρέχεται reviewId, αποθηκεύουμε το αποτέλεσμα στη βάση δεδομένων
    if (reviewId) {
      const supabase = createClient();

      // Ενημέρωση του πίνακα customer_reviews
      await supabase
        .from('customer_reviews')
        .update({ processed: true })
        .eq('id', reviewId);

      // Εισαγωγή της ανάλυσης στον πίνακα sentiment_analysis
      await supabase.from('sentiment_analysis').insert({
        review_id: reviewId,
        sentiment_label: result.sentimentLabel,
        sentiment_score: result.sentimentScore,
        negative_score: result.scores.negative,
        positive_score: result.scores.positive,
        neutral_score: result.scores.neutral
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Σφάλμα στο API ανάλυσης συναισθήματος:', error);
    return NextResponse.json(
      { error: `Σφάλμα κατά την ανάλυση συναισθήματος: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sentiment/batch
 * 
 * Δέχεται πολλαπλά κείμενα και επιστρέφει την ανάλυση συναισθήματος για καθένα.
 */
export async function POST_batch(request: NextRequest) {
  try {
    const json = await request.json();
    const { texts } = json;

    if (!texts || !Array.isArray(texts)) {
      return NextResponse.json(
        { error: 'Απαιτείται πίνακας κειμένων για ανάλυση' },
        { status: 400 }
      );
    }

    // Ανάλυση συναισθήματος για κάθε κείμενο
    const results = await analyzeBatchSentiment(texts);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Σφάλμα στο API ανάλυσης συναισθήματος (batch):', error);
    return NextResponse.json(
      { error: `Σφάλμα κατά την ανάλυση συναισθήματος: ${error.message}` },
      { status: 500 }
    );
  }
} 