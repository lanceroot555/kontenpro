import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-[0.06em]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#c20019]",
        destructive: "bg-primary text-primary-foreground hover:bg-[#c20019]",
        outline:
          "border border-ink bg-surface text-ink hover:bg-ink hover:text-surface",
        secondary: "bg-surface text-ink border border-ink hover:bg-ink hover:text-surface",
        ghost: "text-ink hover:underline normal-case tracking-normal",
        link: "text-ink underline-offset-4 underline normal-case tracking-normal",
      },
      size: {
        default: "h-11 px-8 text-[14px]",
        sm: "h-9 px-4 text-[12px]",
        lg: "h-12 px-10 text-[14px]",
        icon: "h-10 w-10 text-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
