import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

const MountainMark = ({ className }: Props) => (
  <svg
    viewBox="0 0 48 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('text-primary', className)}
    aria-hidden="true"
  >
    <path
      d="M24 4 L44 36 H4 Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M16 22 L20 16 L24 22"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export default MountainMark;
