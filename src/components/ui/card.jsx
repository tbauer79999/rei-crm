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

export function CardHeader({ children }) {
  return <div className="px-6 py-4 border-b">{children}</div>;
}

export function CardTitle({ children }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function CardDescription({ children }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}

export function CardFooter({ children }) {
  return <div className="px-6 py-4 border-t">{children}</div>;
}
