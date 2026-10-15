"use client";

import { Suspense } from "react";
import { LoginContent } from "@/components/auth/LoginContent";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
