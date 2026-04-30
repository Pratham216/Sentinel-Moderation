import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

export function Button({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] disabled:opacity-50',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        variant === 'default' &&
          'bg-[hsl(var(--accent))] text-white hover:opacity-90 shadow-lg shadow-[hsl(var(--accent)/0.25)]',
        variant === 'outline' &&
          'border border-[hsl(var(--border))] bg-transparent hover:bg-[hsl(var(--muted))]',
        variant === 'ghost' && 'hover:bg-[hsl(var(--muted))]',
        variant === 'destructive' && 'bg-red-600 text-white hover:bg-red-700',
        className
      )}
      {...props}
    />
  );
}
