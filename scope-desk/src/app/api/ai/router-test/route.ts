import { NextResponse } from "next/server";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { perplexityRouterTestSchema } from "@/lib/validation";
import {
  listPerplexityModels,
  perplexityChatCompletion,
  perplexityMessage,
  PerplexityRouterError,
} from "@/lib/perplexity";

/** Staff-only diagnostic endpoint for the Perplexity Router integration:
 * lets a logged-in user confirm PERPLEXITY_API_KEY works, browse this key's
 * model catalog, and send one real prompt through either Router schema. Not
 * a customer-facing feature — a smoke test for the integration in
 * src/lib/perplexity.ts. */

export async function GET() {
  try {
    await requireUser();
    const models = await listPerplexityModels();
    return NextResponse.json({ models });
  } catch (err) {
    return routerErrorResponse(err) ?? handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const data = await parseJson(req, perplexityRouterTestSchema);

    if (data.schema === "messages") {
      const response = await perplexityMessage({
        model: data.model,
        maxTokens: data.maxTokens ?? 512,
        messages: [{ role: "user", content: data.prompt }],
      });
      const text = response.content
        .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
        .map((block) => block.text)
        .join("");
      return NextResponse.json({ schema: "messages", model: response.model, content: text, usage: response.usage });
    }

    const response = await perplexityChatCompletion({
      model: data.model,
      messages: [{ role: "user", content: data.prompt }],
      maxTokens: data.maxTokens ?? 512,
    });
    return NextResponse.json({
      schema: "chat",
      model: response.model,
      content: response.choices[0]?.message?.content ?? "",
      usage: response.usage,
    });
  } catch (err) {
    return routerErrorResponse(err) ?? handleApiError(err);
  }
}

function routerErrorResponse(err: unknown) {
  if (!(err instanceof PerplexityRouterError)) return null;
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
  const headers = err.retryAfterSeconds != null ? { "Retry-After": String(err.retryAfterSeconds) } : undefined;
  return NextResponse.json({ error: err.message }, { status, headers });
}
