-- Database setup για την εφαρμογή QA Sentiment Analysis

-- Δημιουργία των τύπων enum
CREATE TYPE user_role AS ENUM ('agent', 'tl', 'admin');

-- 1. Δημιουργία του πίνακα users (υπάρχον)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    team_leader_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Δημιουργία του πίνακα qa_evaluations (υπάρχον)
CREATE TABLE IF NOT EXISTS qa_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT NOT NULL,
    agent_id UUID NOT NULL REFERENCES users(id),
    manual_score NUMERIC,
    ai_score NUMERIC,
    qa_kpi_category TEXT[],
    accuracy NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Δημιουργία του πίνακα customer_reviews (νέος)
-- Αποθηκεύει τις κριτικές των πελατών για ανάλυση συναισθήματος
CREATE TABLE IF NOT EXISTS customer_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    contact_info TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Δημιουργία του πίνακα sentiment_analysis (νέος)
-- Αποθηκεύει τα αποτελέσματα της ανάλυσης συναισθήματος
CREATE TABLE IF NOT EXISTS sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES customer_reviews(id) ON DELETE CASCADE,
    sentiment_label TEXT NOT NULL,
    sentiment_score NUMERIC NOT NULL,
    negative_score NUMERIC NOT NULL,
    positive_score NUMERIC NOT NULL,
    neutral_score NUMERIC NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Δημιουργία ευρετηρίων για βελτιστοποίηση των queries
CREATE INDEX IF NOT EXISTS idx_qa_evaluations_agent_id ON qa_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_review_id ON sentiment_analysis(review_id);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_processed ON customer_reviews(processed);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_sentiment_label ON sentiment_analysis(sentiment_label);

-- Δημιουργία policies του Supabase για Row Level Security (RLS)
-- Σημείωση: Αυτές πρέπει να προσαρμοστούν ανάλογα με τις ανάγκες ασφαλείας σας

-- Ενεργοποίηση RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;

-- Policies για τον πίνακα users
CREATE POLICY "Οι χρήστες μπορούν να δουν όλους τους χρήστες" 
ON users FOR SELECT USING (true);

CREATE POLICY "Μόνο οι admins μπορούν να διαχειριστούν χρήστες" 
ON users FOR ALL USING (auth.jwt() -> 'role' = 'admin');

-- Policies για τον πίνακα qa_evaluations
CREATE POLICY "Οι agents βλέπουν μόνο τις δικές τους αξιολογήσεις" 
ON qa_evaluations FOR SELECT USING (
    agent_id = auth.uid() OR 
    auth.jwt() -> 'role' = 'tl' OR 
    auth.jwt() -> 'role' = 'admin'
);

CREATE POLICY "Οι TLs διαχειρίζονται αξιολογήσεις για τους agents τους" 
ON qa_evaluations FOR ALL USING (
    auth.jwt() -> 'role' = 'tl' OR 
    auth.jwt() -> 'role' = 'admin'
);

-- Policies για τον πίνακα customer_reviews
CREATE POLICY "Όλοι μπορούν να δουν customer_reviews" 
ON customer_reviews FOR SELECT USING (true);

CREATE POLICY "Όλοι οι χρήστες μπορούν να εισάγουν customer_reviews" 
ON customer_reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "Μόνο admins και TLs μπορούν να επεξεργαστούν customer_reviews" 
ON customer_reviews FOR UPDATE USING (
    auth.jwt() -> 'role' = 'tl' OR 
    auth.jwt() -> 'role' = 'admin'
);

-- Policies για τον πίνακα sentiment_analysis
CREATE POLICY "Όλοι μπορούν να δουν sentiment_analysis" 
ON sentiment_analysis FOR SELECT USING (true);

CREATE POLICY "Μόνο admins και TLs μπορούν να διαχειριστούν sentiment_analysis" 
ON sentiment_analysis FOR ALL USING (
    auth.jwt() -> 'role' = 'tl' OR 
    auth.jwt() -> 'role' = 'admin'
);

-- Εισαγωγή δεδομένων δοκιμής για την εφαρμογή QA Sentiment Analysis

-- Καθαρισμός προηγούμενων δεδομένων (προαιρετικό, αφαιρέστε τα σε παραγωγικό περιβάλλον)
TRUNCATE TABLE sentiment_analysis CASCADE;
TRUNCATE TABLE customer_reviews CASCADE;
TRUNCATE TABLE qa_evaluations CASCADE;
TRUNCATE TABLE users CASCADE;

-- Εισαγωγή χρηστών (users)
INSERT INTO users (id, name, email, role, team_leader_id, is_active) VALUES
('d7f3a290-c070-4f80-9f8e-7e8b440b0c85', 'Αντώνης Αδμινόπουλος', 'admin@example.com', 'admin', NULL, true),
('f4b3d8a1-2ed5-4e33-a1b9-9f8d6cb9f3b2', 'Μαρία Ηγετίδου', 'tl1@example.com', 'tl', 'd7f3a290-c070-4f80-9f8e-7e8b440b0c85', true),
('72e920a5-8b4c-4fce-9f0e-1d6a3b2c4d7e', 'Γιώργος Βοηθόπουλος', 'tl2@example.com', 'tl', 'd7f3a290-c070-4f80-9f8e-7e8b440b0c85', true),
('b1c2d3e4-f5a6-4b7c-8d9e-1a2b3c4d5e6f', 'Ελένη Εξυπηρετική', 'agent1@example.com', 'agent', 'f4b3d8a1-2ed5-4e33-a1b9-9f8d6cb9f3b2', true),
('a9b8c7d6-e5f4-4a3b-2c1d-0e9f8a7b6c5d', 'Νίκος Εργασιακός', 'agent2@example.com', 'agent', 'f4b3d8a1-2ed5-4e33-a1b9-9f8d6cb9f3b2', true),
('e1d2c3b4-a5f6-7e8d-9c0b-1a2b3c4d5e6f', 'Κατερίνα Βοηθητική', 'agent3@example.com', 'agent', '72e920a5-8b4c-4fce-9f0e-1d6a3b2c4d7e', true),
('f6e5d4c3-b2a1-0f9e-8d7c-6b5a4c3d2e1f', 'Δημήτρης Υποστηρικτικός', 'agent4@example.com', 'agent', '72e920a5-8b4c-4fce-9f0e-1d6a3b2c4d7e', true);

-- Εισαγωγή αξιολογήσεων (qa_evaluations)
INSERT INTO qa_evaluations (ticket_id, agent_id, manual_score, ai_score, qa_kpi_category, accuracy, notes, created_at) VALUES
('TK-2023-0001', 'b1c2d3e4-f5a6-4b7c-8d9e-1a2b3c4d5e6f', 4.5, 4.2, ARRAY['επικοινωνία', 'επίλυση προβλημάτων'], 0.93, 'Εξαιρετική εξυπηρέτηση πελάτη.', NOW() - INTERVAL '30 days'),
('TK-2023-0002', 'a9b8c7d6-e5f4-4a3b-2c1d-0e9f8a7b6c5d', 3.8, 3.5, ARRAY['επικοινωνία'], 0.92, 'Καλή επικοινωνία αλλά αργή επίλυση.', NOW() - INTERVAL '25 days'),
('TK-2023-0003', 'e1d2c3b4-a5f6-7e8d-9c0b-1a2b3c4d5e6f', 4.2, 4.0, ARRAY['τεχνική γνώση', 'επίλυση προβλημάτων'], 0.95, 'Άριστη τεχνική γνώση, καλή επικοινωνία.', NOW() - INTERVAL '20 days'),
('TK-2023-0004', 'f6e5d4c3-b2a1-0f9e-8d7c-6b5a4c3d2e1f', 3.5, 3.8, ARRAY['επικοινωνία', 'ταχύτητα'], 0.90, 'Γρήγορη εξυπηρέτηση αλλά με μικρές αστοχίες.', NOW() - INTERVAL '15 days'),
('TK-2023-0005', 'b1c2d3e4-f5a6-4b7c-8d9e-1a2b3c4d5e6f', 4.7, 4.5, ARRAY['επικοινωνία', 'επίλυση προβλημάτων', 'τεχνική γνώση'], 0.96, 'Εξαιρετικός σε όλα τα επίπεδα.', NOW() - INTERVAL '10 days'),
('TK-2023-0006', 'a9b8c7d6-e5f4-4a3b-2c1d-0e9f8a7b6c5d', 4.0, 3.9, ARRAY['ταχύτητα', 'επίλυση προβλημάτων'], 0.88, 'Καλή επίλυση αλλά με καθυστέρηση.', NOW() - INTERVAL '5 days'),
('TK-2023-0007', 'e1d2c3b4-a5f6-7e8d-9c0b-1a2b3c4d5e6f', 3.9, 4.1, ARRAY['επικοινωνία'], 0.91, 'Πολύ καλή επικοινωνία.', NOW() - INTERVAL '3 days'),
('TK-2023-0008', 'f6e5d4c3-b2a1-0f9e-8d7c-6b5a4c3d2e1f', 4.3, 4.2, ARRAY['τεχνική γνώση', 'ταχύτητα'], 0.94, 'Γρήγορη και άρτια τεχνική υποστήριξη.', NOW() - INTERVAL '1 day');

-- Εισαγωγή κριτικών πελατών (customer_reviews)
INSERT INTO customer_reviews (id, content, source, contact_info, processed, created_at) VALUES
('c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'Είμαι πολύ ευχαριστημένος με την εξυπηρέτηση. Ο υπάλληλος ήταν ευγενικός και με βοήθησε να λύσω το πρόβλημά μου γρήγορα.', 'email', 'happy.customer@example.com', true, NOW() - INTERVAL '14 days'),
('d2e3f4a5-b6c7-d8e9-f0a1-b2c3d4e5f6a7', 'Αν και ο υπάλληλος ήταν ευγενικός, το πρόβλημά μου δεν λύθηκε πλήρως. Χρειάστηκε να επικοινωνήσω ξανά για την ολοκλήρωση.', 'support_ticket', 'somewhat.satisfied@example.com', true, NOW() - INTERVAL '12 days'),
('e3f4a5b6-c7d8-e9f0-a1b2-c3d4e5f6a7b8', 'Απαράδεκτη εξυπηρέτηση. Περίμενα πάνω από 20 λεπτά στο τηλέφωνο και όταν τελικά μίλησα με κάποιον, δεν μπόρεσε να με βοηθήσει.', 'contact_form', 'angry.person@example.com', true, NOW() - INTERVAL '10 days'),
('f4a5b6c7-d8e9-f0a1-b2c3-d4e5f6a7b8c9', 'Όλα άψογα! Ταχύτατη εξυπηρέτηση και επαγγελματισμός.', 'review', 'satisfied.client@example.com', true, NOW() - INTERVAL '8 days'),
('a5b6c7d8-e9f0-a1b2-c3d4-e5f6a7b8c9d0', 'Το προϊόν λειτουργεί εντάξει, αλλά η διαδικασία παραγγελίας ήταν αρκετά περίπλοκη.', 'email', 'neutral.user@example.com', true, NOW() - INTERVAL '6 days'),
('b6c7d8e9-f0a1-b2c3-d4e5-f6a7b8c9d0e1', 'Δεν μπορώ να πω ότι είμαι ιδιαίτερα ευχαριστημένος ούτε δυσαρεστημένος. Απλά έκαναν τη δουλειά τους.', 'social_media', 'average.person@example.com', true, NOW() - INTERVAL '4 days'),
('c7d8e9f0-a1b2-c3d4-e5f6-a7b8c9d0e1f2', 'Εξαιρετική εμπειρία αγοράς! Θα συνιστούσα την εταιρεία σε όλους τους φίλους μου.', 'review', NULL, true, NOW() - INTERVAL '2 days'),
('d8e9f0a1-b2c3-d4e5-f6a7-b8c9d0e1f2a3', 'Έχω αγοράσει πολλές φορές από εσάς και πάντα μένω ευχαριστημένος. Συνεχίστε έτσι!', 'email', 'loyal.customer@example.com', true, NOW() - INTERVAL '1 day'),
('e9f0a1b2-c3d4-e5f6-a7b8-c9d0e1f2a3b4', 'Η εξυπηρέτηση ήταν αποδεκτή αλλά υπάρχουν περιθώρια βελτίωσης στο χρόνο παράδοσης.', 'support_ticket', 'constructive.feedback@example.com', true, NOW() - INTERVAL '12 hours'),
('f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5', 'Το προϊόν που έλαβα ήταν ελαττωματικό και η διαδικασία επιστροφής ήταν εξαιρετικά χρονοβόρα. Δεν θα ξαναγοράσω.', 'contact_form', 'disappointed.customer@example.com', false, NOW() - INTERVAL '6 hours');

-- Εισαγωγή αναλύσεων συναισθήματος (sentiment_analysis)
INSERT INTO sentiment_analysis (review_id, sentiment_label, sentiment_score, negative_score, positive_score, neutral_score, comments, created_at) VALUES
('c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'Θετικό', 0.92, 0.03, 0.92, 0.05, 'Πολύ θετική ανατροφοδότηση για την εξυπηρέτηση', NOW() - INTERVAL '13 days'),
('d2e3f4a5-b6c7-d8e9-f0a1-b2c3d4e5f6a7', 'Ουδέτερο', 0.68, 0.25, 0.52, 0.68, 'Μικτά συναισθήματα με κλίση προς ουδέτερο', NOW() - INTERVAL '11 days'),
('e3f4a5b6-c7d8-e9f0-a1b2-c3d4e5f6a7b8', 'Αρνητικό', 0.85, 0.85, 0.04, 0.11, 'Έντονα αρνητικό, πρέπει να διερευνηθεί περαιτέρω', NOW() - INTERVAL '9 days'),
('f4a5b6c7-d8e9-f0a1-b2c3-d4e5f6a7b8c9', 'Θετικό', 0.96, 0.01, 0.96, 0.03, 'Εξαιρετικά θετική ανατροφοδότηση', NOW() - INTERVAL '7 days'),
('a5b6c7d8-e9f0-a1b2-c3d4-e5f6a7b8c9d0', 'Ουδέτερο', 0.72, 0.15, 0.41, 0.72, 'Κυρίως ουδέτερο με κάποια θετικά στοιχεία', NOW() - INTERVAL '5 days'),
('b6c7d8e9-f0a1-b2c3-d4e5-f6a7b8c9d0e1', 'Ουδέτερο', 0.89, 0.06, 0.17, 0.89, 'Σαφώς ουδέτερο συναίσθημα', NOW() - INTERVAL '3 days'),
('c7d8e9f0-a1b2-c3d4-e5f6-a7b8c9d0e1f2', 'Θετικό', 0.91, 0.02, 0.91, 0.07, 'Πολύ θετική ανατροφοδότηση με σύσταση', NOW() - INTERVAL '1 day'),
('d8e9f0a1-b2c3-d4e5-f6a7-b8c9d0e1f2a3', 'Θετικό', 0.88, 0.05, 0.88, 0.07, 'Θετικό από σταθερό πελάτη', NOW() - INTERVAL '20 hours'),
('e9f0a1b2-c3d4-e5f6-a7b8-c9d0e1f2a3b4', 'Ουδέτερο', 0.61, 0.31, 0.38, 0.61, 'Ανάμικτα συναισθήματα με εποικοδομητική κριτική', NOW() - INTERVAL '10 hours');