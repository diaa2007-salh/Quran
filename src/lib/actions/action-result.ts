import type { z } from "zod";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Every Server Action below used to call schema.parse(input) directly,
 * which throws on invalid input. A thrown error inside a client
 * useTransition callback becomes an unhandled promise rejection - no
 * error state, no message, the button just silently stops being pending.
 * This makes validation failures a normal, handleable result instead.
 */
export function safeParseOrError<T>(
  schema: z.ZodType<T>,
  input: unknown,
  errorMessage: string
): ActionResult<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { success: false, error: errorMessage };
  }
  return { success: true, data: result.data };
}
