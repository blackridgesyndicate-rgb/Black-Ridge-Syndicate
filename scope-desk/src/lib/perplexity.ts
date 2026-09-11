import "server-only";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Perplexity Router API integration.
 *
 * The Router serves frontier models (Claude, GPT, Gemini, ...) behind two
 * provider-compatible schemas, selected by which SDK/base-URL you use:
 *
 *  - OpenAI SDK -> https://api.perplexity.ai/router/v1 -> POST /chat/completions
 *  - Anthropic SDK -> https://api.perplexity.ai/router -> POST /v1/messages
 *    (the Anthropic SDK appends "/v1/messages" itself, so the base URL here
 *    deliberately omits the "/v1" segment the OpenAI path needs)
 *
 * The Perplexity SDK is NOT used here — it targets the separate, web-grounded
 * Agent API, not the Router.
 */

const CHAT_COMPLETIONS_BASE_URL = "https://api.perplexity.ai/router/v1";
const MESSAGES_BASE_URL = "https://api.perplexity.ai/router";
const MODELS_URL = "https://api.perplexity.ai/router/v1/models";

function getApiKey(): string {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key || key === "pplx-replace_me") {
    throw new PerplexityRouterError(
      "PERPLEXITY_API_KEY is not configured. Create one at https://console.perplexity.ai and " +
        "export it in your own terminal (or set it in .env for local dev) — see README. Never " +
        "paste the key into chat; if it was ever exposed, rotate it in the console.",
      undefined,
      null
    );
  }
  return key;
}

let cachedChatClient: OpenAI | null = null;

/** Lazily-constructed OpenAI-SDK client pointed at the Router's Chat
 * Completions schema. Throws at call time (not import time) if
 * PERPLEXITY_API_KEY is missing, so the rest of the app keeps working
 * without it configured. */
export function getPerplexityChatClient(): OpenAI {
  const key = getApiKey();
  if (!cachedChatClient) {
    cachedChatClient = new OpenAI({ apiKey: key, baseURL: CHAT_COMPLETIONS_BASE_URL });
  }
  return cachedChatClient;
}

let cachedMessagesClient: Anthropic | null = null;

/** Lazily-constructed Anthropic-SDK client pointed at the Router's Messages
 * schema. Same lazy/throws-at-call-time behavior as getPerplexityChatClient. */
export function getPerplexityMessagesClient(): Anthropic {
  const key = getApiKey();
  if (!cachedMessagesClient) {
    cachedMessagesClient = new Anthropic({ apiKey: key, baseURL: MESSAGES_BASE_URL });
  }
  return cachedMessagesClient;
}

/** Error raised for any failed Router call, from either schema, normalized
 * to a single shape so callers don't need to know which SDK was used. */
export class PerplexityRouterError extends Error {
  readonly status: number | undefined;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, status: number | undefined, retryAfterSeconds: number | null) {
    super(message);
    this.name = "PerplexityRouterError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function retryAfterFromHeaders(headers: Headers | undefined): number | null {
  const raw = headers?.get("retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds : null;
}

function reasonForStatus(status: number | undefined, retryAfterSeconds: number | null): string {
  switch (status) {
    case 400:
      return "Unknown or malformed model slug — call listPerplexityModels() to confirm the slug " +
        "is in this key's catalog rather than hardcoding it.";
    case 401:
      return "Authentication failed — check that PERPLEXITY_API_KEY is valid. If it may have been " +
        "exposed, rotate it at https://console.perplexity.ai.";
    case 402:
      return "This model is not included in your account's access tier — see " +
        "https://docs.perplexity.ai/docs/getting-started/pricing.";
    case 429:
      return retryAfterSeconds
        ? `Rate limited or the requested model is temporarily overloaded — retry after ${retryAfterSeconds}s.`
        : "Rate limited or the requested model is temporarily overloaded.";
    default:
      return "Perplexity Router API request failed.";
  }
}

/** Normalizes an error thrown by either the OpenAI or Anthropic SDK (both
 * expose a matching APIError shape: status + headers + message) into a
 * PerplexityRouterError with a Router-specific, actionable message. */
function wrapSdkError(err: unknown): PerplexityRouterError {
  if (err instanceof PerplexityRouterError) return err;
  if (err instanceof OpenAI.APIError || err instanceof Anthropic.APIError) {
    const retryAfterSeconds = retryAfterFromHeaders(err.headers);
    return new PerplexityRouterError(
      `${reasonForStatus(err.status, retryAfterSeconds)} (HTTP ${err.status ?? "unknown"}: ${err.message})`,
      err.status,
      retryAfterSeconds
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  return new PerplexityRouterError(`Perplexity Router API request failed: ${message}`, undefined, null);
}

export interface PerplexityRouterModel {
  id: string;
  [key: string]: unknown;
}

let modelsCache: { at: number; models: PerplexityRouterModel[] } | null = null;
const MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

/** Fetches this API key's tier-aware model catalog from GET /router/v1/models.
 * Always resolve model slugs against this rather than hardcoding a slug —
 * an unlisted slug returns 400, a tier-excluded one returns 402. Cached for
 * 5 minutes; pass `fresh: true` to bypass the cache. */
export async function listPerplexityModels(opts?: { fresh?: boolean }): Promise<PerplexityRouterModel[]> {
  if (!opts?.fresh && modelsCache && Date.now() - modelsCache.at < MODELS_CACHE_TTL_MS) {
    return modelsCache.models;
  }
  const key = getApiKey();
  let res: Response;
  try {
    res = await fetch(MODELS_URL, { headers: { Authorization: `Bearer ${key}` } });
  } catch (err) {
    throw wrapSdkError(err);
  }
  if (!res.ok) {
    const retryAfterSeconds = retryAfterFromHeaders(res.headers);
    const bodyText = await res.text().catch(() => "");
    throw new PerplexityRouterError(
      `${reasonForStatus(res.status, retryAfterSeconds)} (HTTP ${res.status}${bodyText ? `: ${bodyText.slice(0, 300)}` : ""})`,
      res.status,
      retryAfterSeconds
    );
  }
  const body: unknown = await res.json();
  const models: PerplexityRouterModel[] = Array.isArray(body)
    ? (body as PerplexityRouterModel[])
    : Array.isArray((body as { data?: unknown })?.data)
      ? ((body as { data: PerplexityRouterModel[] }).data)
      : [];
  modelsCache = { at: Date.now(), models };
  return models;
}

export async function isKnownPerplexityModel(slug: string, opts?: { fresh?: boolean }): Promise<boolean> {
  const models = await listPerplexityModels(opts);
  return models.some((m) => m.id === slug);
}

export interface PerplexityChatCompletionParams {
  /** creator/model-name slug, e.g. "anthropic/claude-sonnet-5" — must be a
   * slug returned by listPerplexityModels() for this API key. */
  model: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  maxTokens?: number;
  temperature?: number;
}

/** Calls the Router's OpenAI-compatible /chat/completions path. Response
 * has exactly one `choices` entry and usage under `prompt_tokens` /
 * `completion_tokens` / `prompt_tokens_details.cached_tokens`. */
export async function perplexityChatCompletion(
  params: PerplexityChatCompletionParams
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const client = getPerplexityChatClient();
  try {
    return await client.chat.completions.create({
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      stream: false,
    });
  } catch (err) {
    throw wrapSdkError(err);
  }
}

export interface PerplexityMessageParams {
  /** creator/model-name slug, e.g. "openai/gpt-5.6-terra". */
  model: string;
  maxTokens: number;
  messages: Anthropic.MessageParam[];
  system?: string;
  temperature?: number;
}

/** Calls the Router's Anthropic-compatible /messages path. Response has
 * `content` blocks (no `choices` field) and usage under `input_tokens` /
 * `output_tokens` / `cache_creation_input_tokens` / `cache_read_input_tokens`. */
export async function perplexityMessage(params: PerplexityMessageParams): Promise<Anthropic.Message> {
  const client = getPerplexityMessagesClient();
  try {
    return await client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      messages: params.messages,
      system: params.system,
      temperature: params.temperature,
    });
  } catch (err) {
    throw wrapSdkError(err);
  }
}
