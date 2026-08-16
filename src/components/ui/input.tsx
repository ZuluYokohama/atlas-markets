import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-sm bg-bg-sunken px-3 text-sm text-fg shadow-[0_0_0_1px_rgb(255_255_255/0.08)] placeholder:text-subtle focus-visible:shadow-[0_0_0_1px_rgb(213_216_207/0.5)]",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
