export function parseIngredientAmount(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const numberValue = Number(trimmed);
  if (Number.isFinite(numberValue) && numberValue > 0) {
    return numberValue;
  }

  const mixedFractionMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1]);
    const numerator = Number(mixedFractionMatch[2]);
    const denominator = Number(mixedFractionMatch[3]);

    if (denominator > 0 && numerator > 0 && numerator < denominator) {
      return whole + numerator / denominator;
    }
  }

  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);

    if (denominator > 0 && numerator > 0) {
      return numerator / denominator;
    }
  }

  return null;
}
