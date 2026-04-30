import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]',
        className
      )}
      {...props}
    />
  );
}
