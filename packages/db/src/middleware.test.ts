import { applyTenantMiddleware } from "./middleware";
import type { PrismaClient } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface MiddlewareParams {
  model?: string;
  action: string;
  args: Record<string, unknown>;
  dataPath: string[];
  runInTransaction: boolean;
}

type MiddlewareFn = (
  params: MiddlewareParams,
  next: (p: MiddlewareParams) => Promise<unknown>
) => Promise<unknown>;

function buildClient(tenantIdFn: () => string | null): {
  client: PrismaClient;
  getMiddleware: () => MiddlewareFn;
} {
  let captured: MiddlewareFn | undefined;

  const client = {
    $use: (fn: MiddlewareFn) => {
      captured = fn;
    },
  } as unknown as PrismaClient;

  applyTenantMiddleware(client, tenantIdFn);

  return {
    client,
    getMiddleware: () => {
      if (!captured) throw new Error("Middleware not registered");
      return captured;
    },
  };
}

function makeParams(overrides: Partial<MiddlewareParams> = {}): MiddlewareParams {
  return {
    model: "Chatbot",
    action: "findMany",
    args: {},
    dataPath: [],
    runInTransaction: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("applyTenantMiddleware", () => {
  describe("read operations", () => {
    test("injects tenantId into findMany where clause", async () => {
      const { getMiddleware } = buildClient(() => "tenant-abc");
      const next = jest.fn().mockResolvedValue([]);
      const params = makeParams({ action: "findMany" });

      await getMiddleware()(params, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ args: { where: { tenantId: "tenant-abc" } } })
      );
    });

    test("injects tenantId into findFirst", async () => {
      const { getMiddleware } = buildClient(() => "tenant-abc");
      const next = jest.fn().mockResolvedValue(null);
      const params = makeParams({ action: "findFirst" });

      await getMiddleware()(params, next);

      expect((next.mock.calls[0] as [MiddlewareParams])[0].args["where"]).toEqual({
        tenantId: "tenant-abc",
      });
    });

    test("injects tenantId into findUnique", async () => {
      const { getMiddleware } = buildClient(() => "tenant-xyz");
      const next = jest.fn().mockResolvedValue(null);
      const params = makeParams({ action: "findUnique", args: { where: { id: "row-1" } } });

      await getMiddleware()(params, next);

      expect((next.mock.calls[0] as [MiddlewareParams])[0].args["where"]).toEqual({
        id: "row-1",
        tenantId: "tenant-xyz",
      });
    });

    test("injects tenantId into count", async () => {
      const { getMiddleware } = buildClient(() => "tenant-abc");
      const next = jest.fn().mockResolvedValue(0);
      const params = makeParams({ action: "count" });

      await getMiddleware()(params, next);

      expect((next.mock.calls[0] as [MiddlewareParams])[0].args["where"]).toEqual({
        tenantId: "tenant-abc",
      });
    });

    test("preserves existing where conditions on reads", async () => {
      const { getMiddleware } = buildClient(() => "tenant-abc");
      const next = jest.fn().mockResolvedValue([]);
      const params = makeParams({
        action: "findMany",
        args: { where: { isActive: true } },
      });

      await getMiddleware()(params, next);

      expect((next.mock.calls[0] as [MiddlewareParams])[0].args["where"]).toEqual({
        isActive: true,
        tenantId: "tenant-abc",
      });
    });

    test("allows reads without tenantId when getTenantId returns null", async () => {
      const { getMiddleware } = buildClient(() => null);
      const next = jest.fn().mockResolvedValue([]);
      const params = makeParams({ action: "findMany" });

      await expect(getMiddleware()(params, next)).resolves.not.toThrow();
      expect(next).toHaveBeenCalled();
    });
  });

  describe("write operations", () => {
    test("injects tenantId into create data", async () => {
      const { getMiddleware } = buildClient(() => "tenant-abc");
      const next = jest.fn().mockResolvedValue({});
      const params = makeParams({
        action: "create",
        args: { data: { name: "Bot 1" } },
      });

      await getMiddleware()(params, next);

      expect((next.mock.calls[0] as [MiddlewareParams])[0].args["data"]).toEqual({
        name: "Bot 1",
        tenantId: "tenant-abc",
      });
    });

    test("constrains update where clause to tenantId", async () => {
      const { getMiddleware } = buildClient(() => "tenant-abc");
      const next = jest.fn().mockResolvedValue({});
      const params = makeParams({
        action: "update",
        args: { where: { id: "row-1" }, data: { name: "Updated" } },
      });

      await getMiddleware()(params, next);

      expect((next.mock.calls[0] as [MiddlewareParams])[0].args["where"]).toEqual({
        id: "row-1",
        tenantId: "tenant-abc",
      });
    });

    test("constrains delete where clause to tenantId", async () => {
      const { getMiddleware } = buildClient(() => "tenant-abc");
      const next = jest.fn().mockResolvedValue({});
      const params = makeParams({
        action: "delete",
        args: { where: { id: "row-1" } },
      });

      await getMiddleware()(params, next);

      expect((next.mock.calls[0] as [MiddlewareParams])[0].args["where"]).toEqual({
        id: "row-1",
        tenantId: "tenant-abc",
      });
    });

    test("throws when tenantId is null on create", async () => {
      const { getMiddleware } = buildClient(() => null);
      const next = jest.fn();
      const params = makeParams({ action: "create", args: { data: { name: "Bot" } } });

      await expect(getMiddleware()(params, next)).rejects.toThrow("tenantId is required");
      expect(next).not.toHaveBeenCalled();
    });

    test("throws when tenantId is null on update", async () => {
      const { getMiddleware } = buildClient(() => null);
      const next = jest.fn();
      const params = makeParams({ action: "update", args: { where: { id: "1" }, data: {} } });

      await expect(getMiddleware()(params, next)).rejects.toThrow("tenantId is required");
    });
  });

  describe("Tenant model exemption", () => {
    test("does not inject tenantId when model is Tenant", async () => {
      const { getMiddleware } = buildClient(() => "tenant-abc");
      const next = jest.fn().mockResolvedValue([]);
      const params = makeParams({ model: "Tenant", action: "findMany", args: {} });

      await getMiddleware()(params, next);

      // where should NOT have tenantId injected
      const calledParams = (next.mock.calls[0] as [MiddlewareParams])[0];
      expect(calledParams.args["where"]).toBeUndefined();
    });
  });

  describe("passthrough", () => {
    test("returns the value from next()", async () => {
      const { getMiddleware } = buildClient(() => "tenant-abc");
      const next = jest.fn().mockResolvedValue([{ id: "1" }]);
      const params = makeParams({ action: "findMany" });

      const result = await getMiddleware()(params, next);

      expect(result).toEqual([{ id: "1" }]);
    });
  });
});
