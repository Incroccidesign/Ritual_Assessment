"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Card, Field, inputClass } from "@/components/ritual-ui";
import { getCurrentDesigner, isSupabaseConfigured, signInDesigner, signUpDesigner } from "@/lib/auth/designerAuth";
import { mapSignInError, mapSignUpError } from "@/lib/auth/authErrorMessages";
import { useLocale } from "@/lib/i18n/useLocale";

const PASSWORD_MIN_LENGTH = 6;

type FieldErrors = {
  email?: string;
  password?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const { messages, href } = useLocale();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [next, setNext] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/dashboard");
    const requestedMode = params.get("mode");
    setMode(requestedMode === "sign-up" ? "sign-up" : "sign-in");
    void getCurrentDesigner().then((designer) => {
      if (designer) router.replace(params.get("next") || href("/dashboard"));
    });
  }, [href, router]);

  function validate() {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = messages.auth.enterEmail;
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = messages.auth.validEmail;
    }

    if (!password) {
      nextErrors.password = mode === "sign-in" ? messages.auth.enterPassword : messages.auth.createPassword;
    } else if (mode === "sign-up" && password.length < PASSWORD_MIN_LENGTH) {
      nextErrors.password = messages.auth.passwordMin.replace("{min}", String(PASSWORD_MIN_LENGTH));
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit() {
    if (pending) return;
    if (!validate()) return;

    try {
      setPending(true);
      setFormError(null);
      setNotice(null);
      if (mode === "sign-in") {
        await signInDesigner(email.trim(), password);
        router.replace(href(next));
      } else {
        const result = await signUpDesigner(email.trim(), password);
        if (result.requiresEmailConfirmation) {
          setMode("sign-in");
          setPassword("");
          setNotice(messages.auth.signUpSuccess);
          return;
        }
        router.replace(href(next));
      }
    } catch (authError) {
      setFormError(
        mode === "sign-in"
          ? mapSignInError(authError, messages)
          : mapSignUpError(authError, messages, PASSWORD_MIN_LENGTH)
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell compact>
      <Card>
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-mint/25 bg-mint/10 text-mint">
            <Lock size={19} />
          </span>
          <div>
            <h1 className="font-heading text-4xl font-semibold leading-tight text-bone">{messages.auth.title}</h1>
            <p className="mt-3 text-sm leading-6 text-bone/58">{messages.auth.body}</p>
          </div>
        </div>
        {!isSupabaseConfigured ? (
          <p className="mt-7 rounded-md border border-orange/30 bg-orange/10 p-4 text-sm leading-6 text-bone/72">{messages.auth.supabaseRequired}</p>
        ) : (
          <form
            className="mt-7 space-y-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {formError ? <p className="text-sm text-orange">{formError}</p> : null}
            <Field label={messages.auth.email}>
              <>
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                    setFormError(null);
                    setNotice(null);
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email ? <p className="mt-2 text-sm text-orange">{fieldErrors.email}</p> : null}
              </>
            </Field>
            <Field label={messages.auth.password}>
              <>
                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                    setFormError(null);
                    setNotice(null);
                  }}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                {fieldErrors.password ? <p className="mt-2 text-sm text-orange">{fieldErrors.password}</p> : null}
              </>
            </Field>
            {notice ? <p className="text-sm text-mint">{notice}</p> : null}
            <Button className="w-full min-h-12" disabled={pending}>
              {pending
                ? mode === "sign-in"
                  ? messages.auth.signInLoading
                  : messages.auth.signUpLoading
                : mode === "sign-in"
                  ? messages.auth.signIn
                  : messages.auth.signUp}
            </Button>
            <button
              type="button"
              disabled={pending}
              className="w-full text-sm font-medium text-bone/62 transition hover:text-bone"
              onClick={() => {
                setFieldErrors({});
                setFormError(null);
                setNotice(null);
                setMode((current) => current === "sign-in" ? "sign-up" : "sign-in");
              }}
            >
              {mode === "sign-in" ? messages.auth.switchToSignUp : messages.auth.switchToSignIn}
            </button>
          </form>
        )}
      </Card>
    </AppShell>
  );
}
