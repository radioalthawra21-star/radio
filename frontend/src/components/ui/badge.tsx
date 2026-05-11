import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
        success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
      },
    },
    defaultVariants: {
      variant: "default",
    }
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: VariantProps<typeof badgeVariants>['variant'];
}

const Badge = React.forwardRef<
  HTMLSpanElement,
  BadgeProps
>(({ className, variant, ...props }, ref) => (
  <span
    className={badgeVariants({ variant, className })}
    ref={ref}
    {...props}
  >
    {props.children}
  </span>
));

Badge.displayName = 'Badge';

export { Badge };