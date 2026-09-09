"use client";

import { ReactNode } from "react";

const inputCls = "brd-input w-full rounded-sm px-2.5 py-1.5 text-sm";
const labelCls = "brd-eyebrow block mb-1";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className={labelCls}>{label}</label>
        {hint}
      </div>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function NumberInput(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> & {
    value: number | null | undefined;
    onValueChange: (v: number | null) => void;
  }
) {
  const { value, onValueChange, ...rest } = props;
  return (
    <input
      {...rest}
      type="number"
      step="any"
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        onValueChange(v === "" ? null : Number(v));
      }}
      className={`${inputCls} ${rest.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function SourceBadge({ source }: { source?: string }) {
  if (source === "extracted") {
    return <span className="brd-tag rounded-sm px-1.5 py-0.5 border text-brd-success border-brd-success/40">Extracted</span>;
  }
  if (source === "manual") {
    return <span className="brd-tag rounded-sm px-1.5 py-0.5 border text-brd-gold-bright border-brd-gold-dim">Manual</span>;
  }
  if (source === "needs_review") {
    return <span className="brd-tag rounded-sm px-1.5 py-0.5 border text-brd-danger border-brd-danger/40">Needs Review</span>;
  }
  return null;
}

export function ComingSoon({ label = "Coming Soon" }: { label?: string }) {
  return <span className="brd-tag-coming-soon rounded-sm px-2 py-1 inline-block">{label}</span>;
}
