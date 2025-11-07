DROP INDEX IF EXISTS idx_couples_partner_pair;
DROP INDEX IF EXISTS idx_couples_partner2;
DROP INDEX IF EXISTS idx_couples_partner1;
DROP TABLE IF EXISTS couples;

CREATE TABLE couples (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE couple_members (
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (couple_id, user_id)
);

CREATE UNIQUE INDEX idx_couple_members_user_id ON couple_members (user_id);

