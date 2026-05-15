import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

/**
 * Boundless Farm brand mark — highland cow head crop.
 * Component name kept for back-compat across the app.
 */
const MountainMark = ({ className }: Props) => (
  <img
    src="/favicon.png"
    alt=""
    aria-hidden="true"
    className={cn('object-contain dark:invert', className)}
  />
);

export default MountainMark;
