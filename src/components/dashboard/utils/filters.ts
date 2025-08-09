export const filterByDate = (data: Array<{mes: string, total: number}>, startDate: Date | null, endDate: Date | null) => {
  if (!startDate && !endDate) return data;
  
  return data.filter(item => {
    const itemDate = new Date(item.mes + '-01');
    const afterStart = !startDate || itemDate >= startDate;
    const beforeEnd = !endDate || itemDate <= endDate;
    return afterStart && beforeEnd;
  });
};

export const filterMetricsByDate = (metrics: any, startDate: Date | null, endDate: Date | null) => {
  if (!startDate && !endDate) return metrics;

  const startTimestamp = startDate ? startDate.getTime() : 0;
  const endTimestamp = endDate ? endDate.getTime() : Infinity;

  return {
    ...metrics,
    total: metrics.total,
    exitosos: filterMetricByDateRange(metrics.exitosos, startTimestamp, endTimestamp),
    fallidos: filterMetricByDateRange(metrics.fallidos, startTimestamp, endTimestamp),
    en_proceso: filterMetricByDateRange(metrics.en_proceso, startTimestamp, endTimestamp)
  };
};

export const filterMetricByDateRange = (value: number, start: number, end: number) => {
  // Aquí implementarías la lógica específica para filtrar cada métrica
  // Por ahora retornamos el valor original
  return value;
};

export const filterClientesByDate = (clientes: Array<{cliente: string, total: number, mes: string}>, startDate: Date | null, endDate: Date | null) => {
  if (!startDate && !endDate) return clientes;

  return clientes.filter(cliente => {
    const clienteDate = new Date(cliente.mes + '-01');
    const isAfterStart = !startDate || clienteDate >= startDate;
    const isBeforeEnd = !endDate || clienteDate <= endDate;
    return isAfterStart && isBeforeEnd;
  }).sort((a, b) => b.total - a.total);
}; 