-- Agregar columna hora si no existe
ALTER TABLE mantenimientos
ADD COLUMN IF NOT EXISTS hora TIME DEFAULT '00:00:00';

-- Actualizar registros existentes para extraer la hora de la columna fecha
UPDATE mantenimientos
SET hora = TIME(fecha)
WHERE hora IS NULL; 