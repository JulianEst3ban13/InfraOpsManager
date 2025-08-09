-- Tabla para guardar los gastos acumulados pineados por mes
CREATE TABLE IF NOT EXISTS aws_monthly_pinned_totals (
    id SERIAL PRIMARY KEY,
    year INT NOT NULL,
    month INT NOT NULL,
    total NUMERIC(18,2) NOT NULL,
    pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT,
    UNIQUE (year, month)
);
