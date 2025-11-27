-- 1. Crear la nova taula couples amb un nom temporal
CREATE TABLE couples_new (
    id UUID PRIMARY KEY,
    partner1_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner2_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT couples_partner_distinct CHECK (partner1_user_id <> partner2_user_id)
);

-- 2. Migrar les dades de l'antiga estructura a la nova
-- Agafem cada couple i els seus dos membres
INSERT INTO couples_new (id, partner1_user_id, partner2_user_id, created_at)
SELECT 
    c.id,
    cm1.user_id as partner1_user_id,
    cm2.user_id as partner2_user_id,
    c.created_at
FROM couples c
INNER JOIN couple_members cm1 ON c.id = cm1.couple_id
INNER JOIN couple_members cm2 ON c.id = cm2.couple_id AND cm1.user_id < cm2.user_id;

-- 3. Eliminar la constraint antiga de piggybanks
ALTER TABLE piggybanks DROP CONSTRAINT piggybanks_couple_id_fkey;

-- 4. Eliminar les taules antigues
DROP TABLE couple_members;
DROP TABLE couples;

-- 5. Reanomenar la nova taula
ALTER TABLE couples_new RENAME TO couples;

-- 6. Recrear la constraint de piggybanks
ALTER TABLE piggybanks 
    ADD CONSTRAINT piggybanks_couple_id_fkey 
    FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE;

-- 7. Crear els índexs
CREATE UNIQUE INDEX idx_couples_partner1 ON couples (partner1_user_id);
CREATE UNIQUE INDEX idx_couples_partner2 ON couples (partner2_user_id);
CREATE UNIQUE INDEX idx_couples_partner_pair ON couples (
    LEAST(partner1_user_id, partner2_user_id), 
    GREATEST(partner1_user_id, partner2_user_id)
);