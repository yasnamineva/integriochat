import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({ padding = "md", className = "", children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={[
        "rounded-lg border border-gray-200 bg-white shadow-sm",
        paddingClasses[padding],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={["mb-4 flex items-center justify-between", className].join(" ")}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 {...props} className={["text-lg font-semibold text-gray-900", className].join(" ")}>
      {children}
    </h3>
  );
}
