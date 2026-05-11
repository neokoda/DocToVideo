import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-[4px] border border-neutral-200 bg-white px-3 py-1",
        "text-sm text-neutral-950 placeholder:text-neutral-400",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-[4px] border border-neutral-200 bg-white px-3 py-2",
        "text-sm text-neutral-950 placeholder:text-neutral-400",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        "transition-colors",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Input, Textarea };
