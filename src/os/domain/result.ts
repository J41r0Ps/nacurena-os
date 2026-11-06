/**
 * The outcome of something that can fail in an expected way. Unlike a thrown exception, it
 * appears in the function's signature, so the compiler makes the caller deal with both cases.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
