import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
  className?: string;
}

const SectionEyebrow = ({ children, className }: Props) => (
  <span className={cn('eyebrow inline-flex items-center gap-2', className)}>
    <span className="h-px w-6 bg-primary/60" />
    {children}
  </span>
);

export default SectionEyebrow;
