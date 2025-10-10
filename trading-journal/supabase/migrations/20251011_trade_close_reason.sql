-- Migration: Add close_reason to trades
-- Allows capturing the exit reason (TP, SL, manual, etc.)

alter table trades
  add column if not exists close_reason text;
