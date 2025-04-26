import { NextRequest, NextResponse } from 'next/server';
import { analyzeBatchSentiment } from '@/lib/api/sentiment';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sentiment/batch
 * 
 * Δέχεται πολλαπλά κείμενα και επιστρέφει την ανάλυση συναισθήματος για καθένα.
 */
export async function POST(request: NextRequest) {
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