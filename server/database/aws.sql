-- Tabla de presupuestos mensuales de AWS
CREATE TABLE IF NOT EXISTS aws_budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  UNIQUE KEY unique_budget (year, month)
);

-- Tabla de costos diarios de AWS
CREATE TABLE IF NOT EXISTS aws_daily_costs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  day INT NOT NULL,
  week INT NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  INDEX idx_costs_year_month (year, month)
); 