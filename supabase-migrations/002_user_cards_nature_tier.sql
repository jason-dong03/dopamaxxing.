-- Migration 002: Add nature_tier to user_cards
-- Stores the nature tier ('regular', 'legendary', 'divine', 'celestial', '???')
-- so it can be used in battle power calculations.
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS nature_tier text;
