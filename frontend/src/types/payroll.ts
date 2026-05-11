export interface PayrollStats {
  id: number;
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'up' | 'down';
  change: number;
}