// card.jsx
import * as React from "react"

export function Card({ children, className }) {
  return (
    <div
      className={
        "rounded-2xl border bg-card text-card-foreground shadow-sm" +
        (className ? ` ${className}` : "")
      }
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className }) {
  return (
    <div className={"p-6 pt-4" + (className ? ` ${className}` : "")}>{children}</div>
  );
}
