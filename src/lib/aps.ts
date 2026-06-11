export function apsPoints(mark: number): number {
  if (mark >= 80) return 7;
  if (mark >= 70) return 6;
  if (mark >= 60) return 5;
  if (mark >= 50) return 4;
  if (mark >= 40) return 3;
  if (mark >= 30) return 2;
  return mark > 0 ? 1 : 0;
}

export function calcAps(subjects: Array<{ code: string; mark: number }>): number {
  return subjects
    .filter((s) => s.code !== "LO")
    .reduce((sum, s) => sum + apsPoints(s.mark), 0);
}
