import { Messages } from "@/lib/i18n/getMessages";

function readAuthErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code.toLowerCase();
  }
  return "";
}

function readAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message.toLowerCase();
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message.toLowerCase();
  }
  return "";
}

function isNetworkLikeError(error: unknown, message: string) {
  return (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch")
  );
}

export function mapSignInError(error: unknown, messages: Messages) {
  const code = readAuthErrorCode(error);
  const message = readAuthErrorMessage(error);

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return messages.auth.invalidCredentials;
  }

  if (isNetworkLikeError(error, message)) {
    return messages.auth.unexpectedError;
  }

  return messages.auth.unexpectedError;
}

export function mapSignUpError(error: unknown, messages: Messages, passwordMinLength: number) {
  const code = readAuthErrorCode(error);
  const message = readAuthErrorMessage(error);

  if (
    code === "user_already_exists" ||
    message.includes("user already registered") ||
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    return messages.auth.accountExists;
  }

  if (message.includes("password") && message.includes("at least")) {
    return messages.auth.passwordMin.replace("{min}", String(passwordMinLength));
  }

  if (isNetworkLikeError(error, message)) {
    return messages.auth.unexpectedError;
  }

  return messages.auth.unexpectedError;
}
