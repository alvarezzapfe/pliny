export type Metrics = {
  months_analyzed: number;
  total_income: number;
  avg_monthly_income: number;
  income_volatility: number; // coeficiente: stdev / mean
  top_client_concentration: number; // 0..1
  score: number; // 0..100
};

function monthKey(iso: string) {
  // "2025-10-19T..." -> "2025-10"
  return (iso || "").slice(0, 7);
}

export function computeMetricsFromCfdi(params: {
  clientRfc: string;
  cfdi: Array<{ fecha: string; rfcEmisor: string; rfcReceptor: string; total: number }>;
}): Metrics {
  const { clientRfc, cfdi } = params;

  // ingresos: CFDI emitidos por el cliente (emisor = cliente)
  const incomes = cfdi.filter((x) => x.rfcEmisor === clientRfc);

  // por mes
  const byMonth = new Map<string, number>();
  for (const x of incomes) {
    const k = monthKey(x.fecha);
    byMonth.set(k, (byMonth.get(k) ?? 0) + (Number(x.total) || 0));
  }

  const months = Array.from(byMonth.values());
  const months_analyzed = months.length;

  const total_income = months.reduce((a, b) => a + b, 0);
  const avg_monthly_income = months_analyzed ? total_income / months_analyzed : 0;

  const variance =
    months_analyzed && avg_monthly_income
      ? months.reduce((acc, v) => acc + Math.pow(v - avg_monthly_income, 2), 0) / months_analyzed
      : 0;

  const stdev = Math.sqrt(variance);
  const income_volatility = avg_monthly_income ? stdev / avg_monthly_income : 0;

  // concentración por cliente (receptor) dentro de ingresos
  const byReceiver = new Map<string, number>();
  let incomeSum = 0;
  for (const x of incomes) {
    incomeSum += Number(x.total) || 0;
    const k = x.rfcReceptor || "UNKNOWN";
    byReceiver.set(k, (byReceiver.get(k) ?? 0) + (Number(x.total) || 0));
  }
  const top = Math.max(0, ...Array.from(byReceiver.values()));
  const top_client_concentration = incomeSum ? top / incomeSum : 0;

  // score MVP
  let score = 0;
  if (avg_monthly_income >= 500_000) score += 30;
  else if (avg_monthly_income >= 200_000) score += 20;
  else if (avg_monthly_income >= 80_000) score += 10;

  if (income_volatility <= 0.25) score += 25;
  else if (income_volatility <= 0.45) score += 15;
  else score += 5;

  if (top_client_concentration <= 0.40) score += 25;
  else if (top_client_concentration <= 0.60) score += 15;
  else score += 5;

  if (months_analyzed >= 12) score += 20;
  else if (months_analyzed >= 6) score += 10;

  if (score > 100) score = 100;

  return {
    months_analyzed,
    total_income,
    avg_monthly_income,
    income_volatility,
    top_client_concentration,
    score,
  };
}