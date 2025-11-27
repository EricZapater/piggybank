ALTER TABLE piggybanks DROP CONSTRAINT check_owner_or_couple;
ALTER TABLE piggybanks ALTER COLUMN couple_id SET NOT NULL;
ALTER TABLE piggybanks DROP COLUMN owner_user_id;
