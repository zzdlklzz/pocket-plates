import type { HTMLAttributes, ReactNode } from "react";

type InlineNoticeTone = "error" | "info" | "neutral";
type InlineNoticePadding = "default" | "compact" | "slim";

type InlineNoticeProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  padding?: InlineNoticePadding;
  tone: InlineNoticeTone;
};

const TONE_CLASSES: Record<InlineNoticeTone, string> = {
  error: "border-red-100 bg-red-50 text-red-700",
  info: "border-leaf-100 bg-leaf-50 text-slate-700",
  neutral: "border-slate-200 bg-white text-slate-600"
};

const PADDING_CLASSES: Record<InlineNoticePadding, string> = {
  default: "p-4",
  compact: "p-3",
  slim: "px-3 py-2"
};

export function InlineNotice({ children, className, padding = "default", tone, ...props }: InlineNoticeProps) {
  return (
    <p
      className={[
        "rounded-lg border text-sm",
        TONE_CLASSES[tone],
        PADDING_CLASSES[padding],
        className
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </p>
  );
}
