CREATE TABLE IF NOT EXISTS voucher_templates (
    id UUID PRIMARY KEY,
    piggybank_id UUID NOT NULL REFERENCES piggybanks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voucher_templates_piggybank_id ON voucher_templates (piggybank_id);

