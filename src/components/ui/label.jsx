// label.jsx
import * as React from "react"

export const Label = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" +
        (className ? ` ${className}` : "")
      }
      {...props}
    />
  );
});
Label.displayName = "Label";