import { cn } from "@/lib/utils";

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;
type ParagraphProps = React.HTMLAttributes<HTMLParagraphElement>;

export function H1({ className, ...props }: HeadingProps) {
  return (
    <h1
      className={cn("text-3xl font-semibold tracking-tight text-neutral-950", className)}
      {...props}
    />
  );
}

export function H2({ className, ...props }: HeadingProps) {
  return (
    <h2
      className={cn("text-2xl font-semibold tracking-tight text-neutral-950", className)}
      {...props}
    />
  );
}

export function H3({ className, ...props }: HeadingProps) {
  return (
    <h3
      className={cn("text-xl font-semibold tracking-tight text-neutral-950", className)}
      {...props}
    />
  );
}

export function H4({ className, ...props }: HeadingProps) {
  return (
    <h4
      className={cn("text-lg font-semibold text-neutral-950", className)}
      {...props}
    />
  );
}

export function Lead({ className, ...props }: ParagraphProps) {
  return (
    <p
      className={cn("text-lg text-neutral-600 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Body({ className, ...props }: ParagraphProps) {
  return (
    <p
      className={cn("text-sm text-neutral-700 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Caption({ className, ...props }: ParagraphProps) {
  return (
    <p
      className={cn("text-xs text-neutral-500 tracking-wide", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ParagraphProps) {
  return (
    <p
      className={cn("text-xs font-medium uppercase tracking-wider text-neutral-400", className)}
      {...props}
    />
  );
}
