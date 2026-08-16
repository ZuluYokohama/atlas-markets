import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
  {
    variants: {
      tone: {
        mute: "bg-elevated text-muted",
        sage: "bg-sage/15 text-sage",
        clay: "bg-clay/15 text-clay",
        sand: "bg-sand/15 text-sand",
        paper: "bg-accent/15 text-accent",
      },
    },
    defaultVariants: { tone: "mute" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
