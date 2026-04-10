-- Migration 001: Battle Power + Pack Stock
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)

-- ─── battle_power column on profiles ─────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS battle_power integer NOT NULL DEFAULT 0;

-- ─── pack_stock (per-user, refreshes every 5 minutes) ────────────────────────
CREATE TABLE IF NOT EXISTS pack_stock (
    user_id    uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pack_id    text    NOT NULL,
    quantity   integer NOT NULL DEFAULT 0,
    refreshed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, pack_id)
);

ALTER TABLE pack_stock ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own stock rows
CREATE POLICY "pack_stock_owner" ON pack_stock
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS (for server-side mutations)
-- (service_role already bypasses RLS by default in Supabase)

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS pack_stock_user_idx ON pack_stock (user_id);
