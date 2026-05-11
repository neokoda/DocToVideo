import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[4px] px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-950 text-white",
        secondary:
          "bg-neutral-100 text-neutral-700",
        outline:
          "border border-neutral-200 text-neutral-700",
        // Only use these when the semantic meaning requires color
        success:
          "bg-green-50 text-green-700 border border-green-200",
        warning:
          "bg-amber-50 text-amber-700 border border-amber-200",
        destructive:
          "bg-red-50 text-red-700 border border-red-200",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
