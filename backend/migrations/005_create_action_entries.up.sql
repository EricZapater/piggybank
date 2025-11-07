CREATE TABLE IF NOT EXISTS action_entries (
    id UUID PRIMARY KEY,
    voucher_template_id UUID NOT NULL REFERENCES voucher_templates(id) ON DELETE CASCADE,
    giver_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    occurred_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_entries_voucher_id ON action_entries (voucher_template_id);
CREATE INDEX IF NOT EXISTS idx_action_entries_giver_user_id ON action_entries (giver_user_id);

