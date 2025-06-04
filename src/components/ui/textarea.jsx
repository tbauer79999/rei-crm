// textarea.jsx
import * as React from "react"

export const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50" +
        (className ? ` ${className}` : "")
      }
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";