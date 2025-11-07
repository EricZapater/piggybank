CREATE TABLE couple_requests (
    id UUID PRIMARY KEY,
    requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT couple_requests_distinct CHECK (requester_user_id <> target_user_id)
);

CREATE INDEX idx_couple_requests_requester ON couple_requests (requester_user_id);
CREATE INDEX idx_couple_requests_target ON couple_requests (target_user_id);

