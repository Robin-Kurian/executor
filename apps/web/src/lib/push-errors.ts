export type PushRegistrationFailure = {
  title: string;
  message: string;
};

export function getPushRegistrationFailure(error: unknown, isBrave: boolean): PushRegistrationFailure {
  const fallback = "Could not enable notifications. Check this browser's notification settings and try again.";
  const message = error instanceof Error ? error.message : fallback;
  const transportFailed = /registration failed|push service error/i.test(message);

  if (isBrave && transportFailed) {
    return {
      title: "Turn on push messaging in Brave",
      message:
        "Open Brave Settings → Privacy and security, enable ‘Use Google services for push messaging’, fully close and reopen Brave, then try again.",
    };
  }

  if (transportFailed) {
    return {
      title: "Browser push service unavailable",
      message:
        "The browser could not connect to its push service. Check Android system notification permissions and Google Play services, restart the browser, then try again.",
    };
  }

  return { title: "Could not enable notifications", message };
}
