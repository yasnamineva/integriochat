import { NextResponse } from "next/server";
import type { ApiResponse } from "./types";

/** Returns a successful JSON response: `{ success: true, data }` */
export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/** Returns an error JSON response: `{ success: false, error }` */
export function err(
  message: string,
  status = 400,
  headers?: Record<string, string>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error: message }, { status, ...(headers && { headers }) });
}
