-- Themes
CREATE TABLE themes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  emoji      text NOT NULL DEFAULT '📚',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Cards
CREATE TABLE cards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id   uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front      text NOT NULL,
  back       text NOT NULL,
  example    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Card progress (Leitner state)
CREATE TABLE card_progress (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level          int NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 6),
  next_review_at timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, user_id)
);

-- Index for due-cards query
CREATE INDEX idx_card_progress_user_due
  ON card_progress (user_id, next_review_at);

-- RLS
ALTER TABLE themes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own their themes"
  ON themes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own their cards"
  ON cards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own their progress"
  ON card_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
