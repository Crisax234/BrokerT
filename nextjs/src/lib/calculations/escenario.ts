// ============================================================
// Escenario de Inversión — Calculation Engine
// All formulas replicate Excel-based simulation tool behavior.
// ============================================================

export interface UnitData {
  id: string;
  unit_number: string;
  typology: string | null;
  orientation: string | null;
  unit_type: string | null;
  surface_total: number | null;
  surface_useful: number | null;
  list_price: number | null;
  discount: number | null;
  final_price: number | null;
  deed_price: number | null;
  parking: number | null;
  storage: number | null;
  bonus_percentage: number | null;
  pie_percentage: number | null;
  rent_estimate: number | null;
  installments_plan1: number | null;
  installments_plan2: number | null;
  mortgage_max_percentage: number | null;
}

export interface EscenarioInputs {
  clientName: string;
  units: UnitData[];
  abonoMinimo: number;
  abonoExtra: number;
  plazoCreditoYears: number;
  tasaBanco: number;
  cuotonMaximoPct: number;
  plusvaliaPct: number;
  ufToday: number;
  reservationPerUnit: number;
  installmentsToku: number;
  installmentsTC: number;
}

// ============================================================
// CORE FUNCTIONS
// ============================================================

/** Excel PMT function (annual rate, annual periods) */
function pmtExcel(rate: number, nper: number, pv: number): number {
  if (rate === 0) return -pv / nper;
  return -((rate * Math.pow(1 + rate, nper) * pv) /
    (Math.pow(1 + rate, nper) - 1));
}

/** Monthly mortgage payment — matches Excel formula exactly.
 *  Excel uses PMT(annual_rate, years, -price) then divides by 12. */
export function monthlyMortgage(
  creditPct: number,
  annualRate: number,
  years: number,
  deedPriceUF: number,
  ufValue: number,
  insuranceUF: number = 1
): number {
  if (deedPriceUF <= 0 || years <= 0) return 0;
  const pmtResult = pmtExcel(annualRate, years, -deedPriceUF);
  return (creditPct * pmtResult * ufValue / 12) + (insuranceUF * ufValue);
}

/** Credit percentage (derived) */
export function creditPct(bonusPct: number, piePct: number): number {
  return Math.max(1.0 - bonusPct - piePct, 0);
}

/** PIE in pesos */
export function piePesos(deedPriceUF: number, piePct: number, ufValue: number): number {
  return deedPriceUF * piePct * ufValue;
}

/** Total PIE across all units */
export function totalPie(units: UnitData[], ufValue: number): number {
  return units.reduce((sum, u) =>
    sum + piePesos(u.deed_price ?? 0, u.pie_percentage ?? 0, ufValue), 0);
}

/** Reservation total */
export function totalReservation(numUnits: number, reservationPerUnit: number): number {
  return numUnits * reservationPerUnit;
}

/** Abono total */
export function abonoTotal(abonoMinimo: number, abonoExtra: number): number {
  return abonoMinimo + abonoExtra;
}

/** PIE pending */
export function piePending(pieTotalVal: number, reservation: number, abono: number): number {
  return Math.max(pieTotalVal - reservation - abono, 0);
}

/** Option 1 payment plan */
export function paymentPlanOption1(piePendingVal: number, installments: number) {
  const cuota = piePendingVal > 0 && installments > 0 ? piePendingVal / installments : 0;
  return { cuota, total: cuota * installments, installments };
}

/** Option 2 payment plan (TOKU + TC split) */
export function paymentPlanOption2(
  totalDeedPriceUF: number,
  cuotonPct: number,
  ufValue: number,
  piePendingVal: number,
  installmentsToku: number,
  installmentsTC: number
) {
  const cuotonTotal = totalDeedPriceUF * cuotonPct * ufValue;
  const cuotaTC = cuotonTotal > 0 && installmentsTC > 0 ? cuotonTotal / installmentsTC : 0;
  const totalTC = cuotaTC * installmentsTC;

  const remainingForToku = Math.max(piePendingVal - totalTC, 0);
  const cuotaToku = remainingForToku > 0 && installmentsToku > 0 ? remainingForToku / installmentsToku : 0;
  const totalToku = cuotaToku * installmentsToku;

  return {
    toku: { cuota: cuotaToku, total: totalToku, installments: installmentsToku },
    tc: { cuota: cuotaTC, total: totalTC, installments: installmentsTC },
    grandTotal: totalToku + totalTC,
  };
}

/** Cuotón validation */
export function validateCuoton(cuotonPct: number, maxPct: number): { valid: boolean; message: string } {
  if (cuotonPct > maxPct) return { valid: false, message: 'Bajar % de cuotón' };
  return { valid: true, message: 'Todo está ok' };
}

/** Cash flow per unit */
export function cashFlow(rent: number, mortgage: number): number {
  return rent - mortgage;
}

/** Patrimony total in pesos */
export function patrimonioTotal(units: UnitData[], ufValue: number): number {
  return units.reduce((sum, u) => sum + (u.deed_price ?? 0), 0) * ufValue;
}

/** 5-year wealth projection */
export function wealthProjection(patrimonioTotalVal: number, pieTotalPesos: number, plusvaliaPct: number) {
  const years = [patrimonioTotalVal];
  for (let i = 1; i <= 5; i++) {
    years.push(years[i - 1] * (1 + plusvaliaPct));
  }
  return {
    yearlyValues: years,
    ganancia: Math.max(years[5] - patrimonioTotalVal - pieTotalPesos, 0),
  };
}

/** Three mortgage rate scenarios for a single unit */
export function mortgageScenarios(
  unit: UnitData,
  tasaBanco: number,
  plazoCreditoYears: number,
  ufValue: number
) {
  const credit = creditPct(unit.bonus_percentage ?? 0, unit.pie_percentage ?? 0);
  const rateLo = Math.max(tasaBanco - 0.01, 0);
  const rateMid = tasaBanco;
  const rateHi = tasaBanco + 0.01;

  const divLo = monthlyMortgage(credit, rateLo, plazoCreditoYears, unit.deed_price ?? 0, ufValue);
  const divMid = monthlyMortgage(credit, rateMid, plazoCreditoYears, unit.deed_price ?? 0, ufValue);
  const divHi = monthlyMortgage(credit, rateHi, plazoCreditoYears, unit.deed_price ?? 0, ufValue);

  const rent = unit.rent_estimate ?? 0;

  return [
    { rate: rateLo, dividendo: divLo, arriendo: rent, flujo: rent - divLo },
    { rate: rateMid, dividendo: divMid, arriendo: rent, flujo: rent - divMid },
    { rate: rateHi, dividendo: divHi, arriendo: rent, flujo: rent - divHi },
  ];
}

// ============================================================
// FULL SCENARIO COMPUTATION
// ============================================================

export function computeEscenario(inputs: EscenarioInputs) {
  const {
    units, abonoMinimo, abonoExtra, plazoCreditoYears,
    tasaBanco, cuotonMaximoPct, plusvaliaPct, ufToday,
    reservationPerUnit, installmentsToku, installmentsTC,
  } = inputs;

  const abono = abonoTotal(abonoMinimo, abonoExtra);
  const pieTotalVal = totalPie(units, ufToday);
  const reservationVal = totalReservation(units.length, reservationPerUnit);
  const piePendingVal = piePending(pieTotalVal, reservationVal, abono);

  const totalDeedPriceUF = units.reduce((sum, u) => sum + (u.deed_price ?? 0), 0);

  const option1 = paymentPlanOption1(piePendingVal, installmentsToku);
  const option2 = paymentPlanOption2(
    totalDeedPriceUF, cuotonMaximoPct, ufToday,
    piePendingVal, installmentsToku, installmentsTC,
  );

  const maxCuotonPct = 0.03; // default, can be overridden from project config
  const cuotonValidation = validateCuoton(cuotonMaximoPct, maxCuotonPct);

  const unitCashFlows = units.map((unit) => {
    const credit = creditPct(unit.bonus_percentage ?? 0, unit.pie_percentage ?? 0);
    const mortgage = monthlyMortgage(credit, tasaBanco, plazoCreditoYears, unit.deed_price ?? 0, ufToday);
    const rent = unit.rent_estimate ?? 0;
    return {
      unit_number: unit.unit_number,
      arriendo: rent,
      dividendo: mortgage,
      flujo: cashFlow(rent, mortgage),
    };
  });

  const totalFlujo = unitCashFlows.reduce((sum, cf) => sum + cf.flujo, 0);

  const patrimonioVal = patrimonioTotal(units, ufToday);
  const wealth = wealthProjection(patrimonioVal, pieTotalVal, plusvaliaPct);

  const scenarios = units.map((unit) => ({
    unit_number: unit.unit_number,
    typology: unit.typology,
    deed_price: unit.deed_price ?? 0,
    credit_pct: creditPct(unit.bonus_percentage ?? 0, unit.pie_percentage ?? 0),
    loan_amount_uf: (unit.deed_price ?? 0) * creditPct(unit.bonus_percentage ?? 0, unit.pie_percentage ?? 0),
    scenarios: mortgageScenarios(unit, tasaBanco, plazoCreditoYears, ufToday),
  }));

  return {
    abono,
    pieTotalVal,
    reservationVal,
    piePendingVal,
    option1,
    option2,
    cuotonValidation,
    unitCashFlows,
    totalFlujo,
    patrimonioVal,
    wealth,
    scenarios,
  };
}
