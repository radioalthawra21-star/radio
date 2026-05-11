import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const selectTriggerVariants = cva(
  "align-items-center flex whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
  {
    variants: {
      // We can add variants if needed
    },
    defaultVariants: {},
  }
);

const selectContentVariants = cva(
  "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-base shadow-lg clip-empty w-full popover:mt-2 popover:w-[var--radix-select-trigger-width] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      // We can add variants if needed
    },
    defaultVariants: {},
  }
);

const selectItemVariants = cva(
  "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  {
    variants: {
      // We can add variants if needed
    },
    defaultVariants: {},
  }
);

const selectValueVariants = cva(
  "flex h-full w-full items-center justify-between text-sm",
  {
    variants: {
      // We can add variants if needed
    },
    defaultVariants: {},
  }
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value: string | number | null;
  onValueChange: (value: string | number | null) => void;
}

const Select = React.forwardRef<
  HTMLDivElement,
  SelectProps
>(({ className, value, onValueChange, children, ...props }, ref) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <div className={className} ref={ref}>
      <SelectTrigger
        className={selectTriggerVariants()}
        ref={triggerRef}
        onOpenChange={setOpen}
        {...props}
      >
        <SelectValue className={selectValueVariants()}>
          {children}
        </SelectValue>
      </SelectTrigger>
      {open && (
        <SelectContent className={selectContentVariants()} ref={contentRef}>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === SelectItem) {
              return React.cloneElement(child, {
                onSelect: (value: string | number | null) => {
                  onValueChange(value);
                  setOpen(false);
                },
              });
            }
            return child;
          })}
        </SelectContent>
      )}
    </div>
  );
});

Select.displayName = 'Select';

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    className={className}
    ref={ref}
    {...props}
    aria-haspopup="listbox"
  >
    {children}
    <span className="ml-2 flex h-4 w-4 items-center justify-center">
      {/* We'll use a simple chevron for now */}
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </span>
  </button>
));

SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.DivHTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    className={className}
    ref={ref}
    role="listbox"
    {...props}
  >
    {children}
  </div>
));

SelectContent.displayName = 'SelectContent';

interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string | number | null;
  onSelect: (value: string | number | null) => void;
}

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  SelectItemProps
>(({ className, value, onSelect, children, ...props }, ref) => (
  <button
    className={selectItemVariants(className)}
    ref={ref}
    value={String(value || '')}
    onClick={() => onSelect(value)}
    {...props}
  >
    {children}
  </button>
));

SelectItem.displayName = 'SelectItem';

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.SpanHTMLAttributes<HTMLSpanElement>
>(({ className, children, placeholder, ...props }, ref) => {
  const hasValue = children !== null && children !== undefined && children !== '';
  return (
    <span
      className={className}
      ref={ref}
      {...props}
    >
      {!hasValue && placeholder ? placeholder : children}
    </span>
  );
});

SelectValue.displayName = 'SelectValue';

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };