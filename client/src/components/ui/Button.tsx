import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-contrast border border-brand hover:brightness-110 disabled:opacity-60',
  ghost:
    'bg-surface-raised text-content border border-border hover:bg-surface-sunken disabled:opacity-60',
  danger:
    'bg-surface-raised text-danger border border-danger/40 hover:bg-danger/5 disabled:opacity-60',
};

export const Button = ({
  variant = 'ghost',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-[background-color,filter] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${VARIANTS[variant]} ${className}`}
  />
);
