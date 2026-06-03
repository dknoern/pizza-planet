"use client";

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 20,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="qty-stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="decrease"
      >
        −
      </button>
      <span className="qty-val">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="increase"
      >
        +
      </button>
    </div>
  );
}
