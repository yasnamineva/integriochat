/**
 * Lightweight mock of next/server for use in packages/utils tests.
 * Returns real Response objects so tests can call .json() and check .status.
 */
export const NextResponse = {
  json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
    return new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  },
};
