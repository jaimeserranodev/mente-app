-- ============================================================
-- Mente — Segundo Cerebro
-- Ejecuta este SQL en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Tabla principal de items
CREATE TABLE IF NOT EXISTS items (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('idea', 'tarea', 'proyecto', 'nota')),
  title       TEXT        NOT NULL,
  description TEXT,
  area        TEXT        NOT NULL DEFAULT 'Todas',
  status      TEXT        CHECK (status IN ('pendiente', 'en_progreso', 'hecha', 'activo', 'pausado', 'completado')),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS items_user_id_idx    ON items(user_id);
CREATE INDEX IF NOT EXISTS items_type_idx       ON items(type);
CREATE INDEX IF NOT EXISTS items_area_idx       ON items(area);
CREATE INDEX IF NOT EXISTS items_created_at_idx ON items(created_at DESC);

-- Activar Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Política: solo ver sus propios items
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

-- Política: solo insertar con su user_id
CREATE POLICY "Users can create own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: solo actualizar sus propios items
CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: solo borrar sus propios items
CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  USING (auth.uid() = user_id);

-- Función para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS items_updated_at ON items;
CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- Tabla de tareas de proyecto (To-Do por proyecto)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_tasks (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID        REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT        NOT NULL,
  done        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project tasks"
  ON project_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
