"use client";

import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/live/utils";

export function SessionQr({ value, size = 220, className }: { value: string; size?: number; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-lg bg-bone p-4", className)}>
      <QRCodeSVG value={value} size={size} bgColor="#F3EFE6" fgColor="#0F1115" level="M" includeMargin={false} />
    </div>
  );
}
