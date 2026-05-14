import { cn } from '@/lib/utils';

interface Props {
  image: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  height?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
}

const heightMap = {
  sm: 'min-h-[260px]',
  md: 'min-h-[360px]',
  lg: 'min-h-[480px]',
};

const HeroFrame = ({
  image,
  eyebrow,
  title,
  subtitle,
  children,
  className,
  height = 'md',
  align = 'center',
}: Props) => (
  <section
    className={cn(
      'relative overflow-hidden rounded-3xl border border-border/60 shadow-cinematic',
      heightMap[height],
      className,
    )}
  >
    <img
      src={image}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover"
    />
    <div className="absolute inset-0 bg-gradient-overlay" />
    <div
      className={cn(
        'relative z-10 flex h-full flex-col justify-end gap-4 p-6 md:p-10',
        align === 'center' && 'items-center text-center',
      )}
    >
      {eyebrow}
      <h1 className="h-display text-3xl md:text-5xl text-foreground max-w-2xl">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm md:text-base text-foreground/80 max-w-xl leading-relaxed">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  </section>
);

export default HeroFrame;
