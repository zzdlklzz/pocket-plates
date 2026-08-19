import { ArrowLeft } from "lucide-react";
import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

type BackLinkProps = {
  children: ReactNode;
  className?: string;
  href: LinkProps["href"];
};

export function BackLink({ children, className, href }: BackLinkProps) {
  return (
    <Link
      className={["inline-flex items-center gap-1 text-sm font-semibold text-leaf-700", className].filter(Boolean).join(" ")}
      href={href}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
