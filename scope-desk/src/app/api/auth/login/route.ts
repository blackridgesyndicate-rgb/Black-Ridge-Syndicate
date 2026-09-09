import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionCookie, verifyPassword } from "@/lib/auth";
import { parseJson, handleApiError } from "@/lib/api";
import { loginSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const { email, password } = await parseJson(req, loginSchema);
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    await createSessionCookie(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    return handleApiError(err);
  }
}
