import { cn } from '@/lib/utils';

interface Props {
  quote: string;
  attribution?: string;
  className?: string;
}

const PullQuote = ({ quote, attribution, className }: Props) => (
  <figure className={cn('relative pl-6', className)}>
    <span
      aria-hidden="true"
      className="absolute left-0 top-0 font-serif-italic text-5xl leading-none text-primary/70 select-none"
    >
      &ldquo;
    </span>
    <blockquote className="h-quote text-xl md:text-2xl text-foreground/90 leading-snug">
      {quote}
    </blockquote>
    {attribution && (
      <figcaption className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        — {attribution}
      </figcaption>
    )}
  </figure>
);

export default PullQuote;
