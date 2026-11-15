// Minimal Web Push sender (RFC 8291 aes128gcm + RFC 8292 VAPID) on Node's built-in crypto — no deps.
import { createCipheriv, createECDH, createPrivateKey, hkdfSync, randomBytes, sign } from "node:crypto";

export type PushSub = { endpoint: string; p256dh: string; auth: string };

const b64u = (b: Buffer) => b.toString("base64url");

function vapidJwt(endpoint: string, subject: string, jwk: JsonWebKey) {
  const aud = new URL(endpoint).origin;
  const header = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const key = createPrivateKey({ key: jwk as never, format: "jwk" });
  const sig = sign("sha256", Buffer.from(`${header}.${claims}`), { key, dsaEncoding: "ieee-p1363" });
  return `${header}.${claims}.${b64u(sig)}`;
}

/** Encrypts a payload for one subscription (aes128gcm, single record). */
export function encrypt(sub: PushSub, payload: Buffer, salt = randomBytes(16)) {
  const uaPub = Buffer.from(sub.p256dh, "base64url");
  const authSecret = Buffer.from(sub.auth, "base64url");
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const asPub = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPub);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPub, asPub]);
  const ikm = Buffer.from(hkdfSync("sha256", shared, authSecret, keyInfo, 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub, body]);
}

/** Sends one push. Returns the HTTP status (201 = delivered to the push service; 404/410 = subscription gone). */
export async function sendPush(sub: PushSub, data: unknown, opts: { publicKey: string; privateJwk: JsonWebKey; subject: string; ttl?: number }) {
  const body = encrypt(sub, Buffer.from(JSON.stringify(data)));
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      authorization: `vapid t=${vapidJwt(sub.endpoint, opts.subject, opts.privateJwk)}, k=${opts.publicKey}`,
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: String(opts.ttl ?? 86400),
      urgency: "high",
    },
    body,
  });
  return res.status;
}
