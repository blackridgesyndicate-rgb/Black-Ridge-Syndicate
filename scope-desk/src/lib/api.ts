import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { ZodType } from "zod";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Not authenticated");
  return user;
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  return result.data;
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
