DROP TABLE IF EXISTS couple_members;
DROP TABLE IF EXISTS couples;

CREATE TABLE couples (
    id UUID PRIMARY KEY,
    partner1_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner2_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT couples_partner_distinct CHECK (partner1_user_id <> partner2_user_id)
);

CREATE UNIQUE INDEX idx_couples_partner1 ON couples (partner1_user_id);
CREATE UNIQUE INDEX idx_couples_partner2 ON couples (partner2_user_id);
CREATE UNIQUE INDEX idx_couples_partner_pair ON couples (LEAST(partner1_user_id, partner2_user_id), GREATEST(partner1_user_id, partner2_user_id));

