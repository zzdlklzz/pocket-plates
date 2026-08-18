import type { HTMLAttributes, ReactNode } from "react";

type AppPageShellProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  spacing?: "content" | "compact";
};

export function AppPageShell({ children, className, spacing = "content", ...props }: AppPageShellProps) {
  const spacingClass = spacing === "content" ? "pb-24 pt-8" : "py-8";

  return (
    <main
      className={[
        "mx-auto min-h-screen max-w-md bg-[#fffdf8] px-5 shadow-sm",
        spacingClass,
        className
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </main>
  );
}
