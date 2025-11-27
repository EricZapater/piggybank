CREATE TABLE couple_requests (
    id UUID PRIMARY KEY,
    requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_email TEXT,
    invitation_token TEXT UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT couple_requests_target_check CHECK (
        (target_user_id IS NOT NULL AND target_email IS NULL) OR
        (target_user_id IS NULL AND target_email IS NOT NULL)
    ),
    CONSTRAINT couple_requests_distinct CHECK (
        target_user_id IS NULL OR requester_user_id <> target_user_id
    )
);

CREATE INDEX idx_couple_requests_requester ON couple_requests (requester_user_id);
CREATE INDEX idx_couple_requests_target_user ON couple_requests (target_user_id);
CREATE INDEX idx_couple_requests_target_email ON couple_requests (target_email);
