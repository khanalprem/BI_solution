import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-bg-card',
        'after:absolute after:inset-0',
        'after:bg-gradient-to-r after:from-transparent after:via-white/[0.05] after:to-transparent',
        'after:animate-[shimmer_1.6s_ease-in-out_infinite]',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
