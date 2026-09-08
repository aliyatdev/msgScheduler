CREATE TABLE IF NOT EXISTS scheduled_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact TEXT NOT NULL,
  message TEXT NOT NULL,
  send_at DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_pending_messages ON scheduled_messages (status, send_at);
