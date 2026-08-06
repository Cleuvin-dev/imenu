/** weekday 0-6 conforme docs/07 (0 = domingo, seguindo o padrão de date-fns/Intl). */
export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export const WEEKDAYS_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
