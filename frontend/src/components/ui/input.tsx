import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      // We can add variants if needed, but for now we have a default
    },
    defaultVariants: {},
  }
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: VariantProps<typeof inputVariants>;
}

const Input = React.forwardRef<
  HTMLInputElement,
  InputProps
>(({ className, ...props }, ref) => (
  <input
    className={inputVariants(className)}
    ref={ref}
    {...props}
  />
));

Input.displayName = 'Input';

export { Input };