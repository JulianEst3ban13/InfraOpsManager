-- Agregar columna hora a la tabla mantenimientos
ALTER TABLE mantenimientos ADD COLUMN hora TIME AFTER fecha;

-- Actualizar registros existentes extrayendo la hora de la columna fecha
UPDATE mantenimientos 
SET hora = TIME(fecha),
    fecha = DATE(fecha)
WHERE hora IS NULL; 