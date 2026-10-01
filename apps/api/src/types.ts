import type { AuthSession } from "./auth/auth";

export type AppEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    requestId: string;
    session: NonNullable<AuthSession>;
  };
};
