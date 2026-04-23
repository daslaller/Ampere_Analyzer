import { json } from '@sveltejs/kit';

export function ok<T>(data: T, init: ResponseInit = {}) {
  return json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return json(
    {
      ok: false,
      error: message,
      details
    },
    { status }
  );
}
