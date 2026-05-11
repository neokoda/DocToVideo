import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        // Black fill — primary action, use sparingly
        default:
          "bg-neutral-950 text-white hover:bg-neutral-800",
        // Outlined — secondary action
        outline:
          "border border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-100",
        // Ghost — tertiary, low emphasis
        ghost:
          "text-neutral-950 hover:bg-neutral-100",
        // Destructive — destructive actions only
        destructive:
          "bg-red-600 text-white hover:bg-red-700",
        // Link — inline text actions
        link:
          "text-neutral-950 underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm:      "h-8  px-3 text-xs rounded-[4px]",
        default: "h-9  px-4 rounded-[4px]",
        lg:      "h-10 px-6 rounded-[4px]",
        icon:    "h-9  w-9  rounded-[4px]",
        "icon-sm": "h-7 w-7 rounded-[4px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
