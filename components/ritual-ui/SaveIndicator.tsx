import Image from "next/image";
import { CloudOff, CloudUpload } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "unsaved";

export function SaveIndicator({ status, savedLabel, savingLabel, errorLabel, unsavedLabel }: {
  status: SaveStatus;
  savedLabel: string;
  savingLabel: string;
  errorLabel: string;
  unsavedLabel?: string;
}) {
  if (status === "idle") return null;
  const label = status === "saved" ? savedLabel : status === "error" ? errorLabel : status === "unsaved" ? (unsavedLabel ?? errorLabel) : savingLabel;
  const Icon = status === "error" || status === "unsaved" ? CloudOff : CloudUpload;
  return <span role="status" aria-label={label} title={label} className={status === "saved" ? "inline-flex text-mint" : status === "error" ? "inline-flex text-orange" : "inline-flex text-bone/55"}>{status === "saved" ? <Image src="/illustrations/saved.svg" alt="" aria-hidden="true" width={32} height={20} /> : <Icon size={21} aria-hidden="true" />}</span>;
}
