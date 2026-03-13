CREATE TABLE prediction_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tmdb_id integer NOT NULL,
  title text,
  predicted_scores jsonb NOT NULL,
  predicted_total real,
  actual_scores jsonb,
  actual_total real,
  delta real,
  confidence text,
  prediction_source text DEFAULT 'claude_v1',
  tag_context_version text,
  user_films_at_prediction integer,
  weights_at_prediction jsonb,
  predicted_at timestamptz NOT NULL DEFAULT now(),
  rated_at timestamptz,
  metadata jsonb
);
CREATE INDEX idx_plog_user ON prediction_log(user_id);
CREATE INDEX idx_plog_tmdb ON prediction_log(tmdb_id);
