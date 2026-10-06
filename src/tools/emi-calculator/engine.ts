export type TenureUnit = 'years' | 'months';

export interface MonthlyAmortizationItem {
  month: number;
  year: number;
  monthInYear: number;
  openingBalance: number;
  emi: number;
  principalPaid: number;
  interestPaid: number;
  closingBalance: number;
}

export interface YearlyAmortizationItem {
  year: number;
  openingBalance: number;
  principalPaid: number;
  interestPaid: number;
  totalPayment: number;
  closingBalance: number;
  monthlyBreakdown: MonthlyAmortizationItem[];
}

export interface EmiCalculationResult {
  monthlyEmi: number;
  principalAmount: number;
  totalInterest: number;
  totalPayment: number;
  principalPercentage: number;
  interestPercentage: number;
  totalMonths: number;
  monthlySchedule: MonthlyAmortizationItem[];
  yearlySchedule: YearlyAmortizationItem[];
}

export interface EmiCalculationParams {
  principal: number;
  annualRate: number;
  tenure: number;
  tenureUnit: TenureUnit;
}

function sanitizeNumber(val: number, fallback = 0): number {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
    return fallback;
  }
  return val;
}

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateEmi(params: EmiCalculationParams): EmiCalculationResult {
  const principal = Math.max(0, sanitizeNumber(params.principal, 0));
  const annualRate = Math.max(0, sanitizeNumber(params.annualRate, 0));
  const rawTenure = Math.max(0, sanitizeNumber(params.tenure, 0));

  const totalMonths = Math.max(
    1,
    Math.round(params.tenureUnit === 'years' ? rawTenure * 12 : rawTenure)
  );

  if (principal === 0) {
    return {
      monthlyEmi: 0,
      principalAmount: 0,
      totalInterest: 0,
      totalPayment: 0,
      principalPercentage: 100,
      interestPercentage: 0,
      totalMonths,
      monthlySchedule: [],
      yearlySchedule: [],
    };
  }

  let monthlyEmi = 0;

  if (annualRate === 0) {
    monthlyEmi = principal / totalMonths;
  } else {
    const monthlyRate = annualRate / 12 / 100;
    const factor = Math.pow(1 + monthlyRate, totalMonths);

    if (factor === 1 || !isFinite(factor)) {
      monthlyEmi = principal / totalMonths;
    } else {
      monthlyEmi = (principal * monthlyRate * factor) / (factor - 1);
    }

    if (!isFinite(monthlyEmi) || isNaN(monthlyEmi)) {
      monthlyEmi = principal / totalMonths;
    }
  }

  const monthlySchedule: MonthlyAmortizationItem[] = [];
  let currentBalance = principal;
  const monthlyRate = annualRate / 12 / 100;

  for (let m = 1; m <= totalMonths; m++) {
    const year = Math.ceil(m / 12);
    const monthInYear = ((m - 1) % 12) + 1;
    const openingBalance = currentBalance;

    const interestPaid = annualRate === 0 ? 0 : openingBalance * monthlyRate;
    let principalPaid = monthlyEmi - interestPaid;

    if (m === totalMonths || principalPaid > currentBalance) {
      principalPaid = currentBalance;
      currentBalance = 0;
    } else {
      currentBalance = Math.max(0, currentBalance - principalPaid);
    }

    const actualEmi = principalPaid + interestPaid;

    monthlySchedule.push({
      month: m,
      year,
      monthInYear,
      openingBalance: roundToTwo(openingBalance),
      emi: roundToTwo(actualEmi),
      principalPaid: roundToTwo(principalPaid),
      interestPaid: roundToTwo(interestPaid),
      closingBalance: roundToTwo(currentBalance),
    });
  }

  const yearlySchedule: YearlyAmortizationItem[] = [];
  const totalYears = Math.ceil(totalMonths / 12);

  for (let y = 1; y <= totalYears; y++) {
    const yearMonths = monthlySchedule.filter((item) => item.year === y);
    if (yearMonths.length === 0) continue;

    const openingBalance = yearMonths[0].openingBalance;
    const closingBalance = yearMonths[yearMonths.length - 1].closingBalance;
    const principalPaid = yearMonths.reduce((sum, item) => sum + item.principalPaid, 0);
    const interestPaid = yearMonths.reduce((sum, item) => sum + item.interestPaid, 0);
    const yearTotalPayment = principalPaid + interestPaid;

    yearlySchedule.push({
      year: y,
      openingBalance: roundToTwo(openingBalance),
      principalPaid: roundToTwo(principalPaid),
      interestPaid: roundToTwo(interestPaid),
      totalPayment: roundToTwo(yearTotalPayment),
      closingBalance: roundToTwo(closingBalance),
      monthlyBreakdown: yearMonths,
    });
  }

  const computedTotalInterest = monthlySchedule.reduce((sum, item) => sum + item.interestPaid, 0);
  const computedTotalPayment = principal + computedTotalInterest;

  const principalPercentage =
    computedTotalPayment > 0 ? (principal / computedTotalPayment) * 100 : 100;
  const interestPercentage =
    computedTotalPayment > 0 ? (computedTotalInterest / computedTotalPayment) * 100 : 0;

  return {
    monthlyEmi: roundToTwo(monthlyEmi),
    principalAmount: roundToTwo(principal),
    totalInterest: roundToTwo(computedTotalInterest),
    totalPayment: roundToTwo(computedTotalPayment),
    principalPercentage: roundToTwo(principalPercentage),
    interestPercentage: roundToTwo(interestPercentage),
    totalMonths,
    monthlySchedule,
    yearlySchedule,
  };
}

export function formatEmiCurrency(amount: number, symbol = '₹', locale = 'en-IN'): string {
  if (isNaN(amount) || !isFinite(amount)) return `${symbol}0`;
  const absAmount = Math.abs(amount);
  const rounded = Math.round(absAmount);
  const formatted = rounded.toLocaleString(locale);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
}
