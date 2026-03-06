import { ok, err } from "./response";

// ─── ok() ─────────────────────────────────────────────────────────────────────

describe("ok()", () => {
  test("returns 200 by default", async () => {
    const res = ok({ id: "1" });
    expect(res.status).toBe(200);
  });

  test("wraps data in success envelope", async () => {
    const res = ok({ id: "1", name: "Test" });
    const body = await res.json() as { success: boolean; data: unknown };
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: "1", name: "Test" });
  });

  test("uses custom status code", async () => {
    const res = ok({ id: "1" }, 201);
    expect(res.status).toBe(201);
  });

  test("works with array data", async () => {
    const res = ok([1, 2, 3]);
    const body = await res.json() as { success: boolean; data: number[] };
    expect(body.data).toEqual([1, 2, 3]);
  });

  test("works with null data", async () => {
    const res = ok(null);
    const body = await res.json() as { success: boolean; data: null };
    expect(body.success).toBe(true);
    expect(body.data).toBeNull();
  });

  test("sets content-type to application/json", () => {
    const res = ok({});
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});

// ─── err() ────────────────────────────────────────────────────────────────────

describe("err()", () => {
  test("returns 400 by default", async () => {
    const res = err("Bad request");
    expect(res.status).toBe(400);
  });

  test("wraps error in failure envelope", async () => {
    const res = err("Something went wrong");
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe("Something went wrong");
  });

  test("uses custom status code", async () => {
    const res = err("Not found", 404);
    expect(res.status).toBe(404);
  });

  test("uses 401 for unauthorized", async () => {
    const res = err("Unauthorized", 401);
    expect(res.status).toBe(401);
  });

  test("uses 422 for validation errors", async () => {
    const res = err("Invalid input", 422);
    expect(res.status).toBe(422);
  });

  test("uses 500 for server errors", async () => {
    const res = err("Internal server error", 500);
    expect(res.status).toBe(500);
  });

  test("sets content-type to application/json", () => {
    const res = err("error");
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
