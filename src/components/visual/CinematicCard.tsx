import * as React from 'react';
import { cn } from '@/lib/utils';

const CinematicCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative rounded-3xl border border-border/80 bg-card/80 backdrop-blur-sm',
      'shadow-elevated transition-all duration-300',
      'before:absolute before:inset-0 before:rounded-3xl before:pointer-events-none',
      'before:bg-gradient-to-br before:from-primary/5 before:via-transparent before:to-transparent',
      'hover:border-primary/40 hover:shadow-cinematic',
      className,
    )}
    {...props}
  />
));
CinematicCard.displayName = 'CinematicCard';

export default CinematicCard;
