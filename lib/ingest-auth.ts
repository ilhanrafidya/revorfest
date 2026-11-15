import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";

const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";
const JWKS = createRemoteJWKSet(new URL(`${GITHUB_ISSUER}/.well-known/jwks`));
const REPO = "ilhanrafidya/revorfest";

/** Accepts a GitHub Actions OIDC token from this repo, or the optional INGEST_SECRET (for PC runners). */
export async function authorizeIngest(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return null;

  if (token.split(".").length === 3) {
    try {
      const { payload } = await jwtVerify(token, JWKS, { issuer: GITHUB_ISSUER, audience: "revorfest-ingest" });
      if (payload.repository === REPO) return "github-actions";
    } catch {
      /* fall through */
    }
  }

  const secret = process.env.INGEST_SECRET;
  if (secret && token.length === secret.length && timingSafeEqual(Buffer.from(token), Buffer.from(secret))) return "secret";
  return null;
}
