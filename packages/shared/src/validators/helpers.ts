import { z, ZodTypeAny } from 'zod';

/**
 * HTML form fields default to empty string `""` when blank. Strict zod
 * validators like `z.string().email()` or `z.string().uuid()` reject `""`,
 * so an unfilled optional field triggers a 400 instead of silently being
 * treated as "not provided". This helper normalizes `""` (and optionally
 * `null`) to `undefined` BEFORE the strict validator runs.
 *
 * Order matters: `.optional()` must live INSIDE the preprocess target so
 * the coerced `undefined` is what the optional check sees. If you wrap the
 * optional outside the preprocess, the original `""` is checked against
 * optional first and gets passed through to the strict validator. See:
 *   z.preprocess(coerce, z.string().email().optional())  ✅
 *   z.preprocess(coerce, z.string().email()).optional()  ❌
 */
export function emptyToUndefined<T extends ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === '' ? undefined : v), schema);
}

/**
 * Variant that also coerces `null` → `undefined`. Use for CREATE schemas
 * where `null` should mean "not provided", not "explicitly clear".
 * For UPDATE schemas where `null` is the user's signal to clear a field,
 * keep using {@link emptyToUndefined} and add `.nullable()` to the schema.
 */
export function nullishToUndefined<T extends ZodTypeAny>(schema: T) {
  return z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    schema
  );
}

/**
 * Common optional-email field. Empty string is treated as "not provided"
 * rather than an invalid email, so unfilled HTML inputs don't 400.
 */
export const optionalEmail = emptyToUndefined(
  z.string().email().max(200).optional()
);

/**
 * Common optional-UUID field. Same rationale as {@link optionalEmail} —
 * unfilled dropdowns (e.g. assignedTo) send `""` which would fail uuid
 * validation otherwise.
 */
export const optionalUuid = emptyToUndefined(z.string().uuid().optional());

/**
 * Like {@link optionalUuid} but also accepts `null` (used by UPDATE
 * schemas where the user wants to clear the assignment).
 */
export const optionalNullableUuid = emptyToUndefined(
  z.string().uuid().optional().nullable()
);
