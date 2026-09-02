import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PAIRING_TOKEN_BYTES } from "@/lib/printanywhere/constants";

export function generateStrongToken(): string {
  return randomBytes(PAIRING_TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}
