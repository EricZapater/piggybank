ALTER TABLE piggybanks ADD COLUMN owner_user_id UUID REFERENCES users(id);
ALTER TABLE piggybanks ALTER COLUMN couple_id DROP NOT NULL;
ALTER TABLE piggybanks ADD CONSTRAINT check_owner_or_couple CHECK (
    (couple_id IS NOT NULL AND owner_user_id IS NULL) OR
    (couple_id IS NULL AND owner_user_id IS NOT NULL)
);
