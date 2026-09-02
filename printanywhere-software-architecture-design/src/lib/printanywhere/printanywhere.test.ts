import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import { generateStrongToken, hashToken } from "@/lib/printanywhere/security";
import { checkTokenRateLimit } from "@/lib/printanywhere/rate-limit";
import { createTempResource, deleteTempResource, verifyTempResourceDeleted } from "@/lib/printanywhere/temp-files";
import { validateUploadedFile } from "@/lib/printanywhere/file-validation";

test("security: generated token is strong and non-predictable", () => {
  const tokenA = generateStrongToken();
  const tokenB = generateStrongToken();

  assert.notEqual(tokenA, tokenB);
  assert.ok(tokenA.length >= 40);
  assert.equal(hashToken(tokenA).length, 64);
});

test("security: per-token rate limit blocks excessive requests", () => {
  const tokenHash = hashToken(generateStrongToken());

  let allowed = 0;
  for (let i = 0; i < 20; i += 1) {
    if (checkTokenRateLimit(tokenHash)) {
      allowed += 1;
    }
  }

  assert.ok(allowed < 20);
});

test("privacy: temp files are deleted immediately", async () => {
  const resource = await createTempResource(Buffer.from("test"), "tmp");
  const existsBeforeDelete = await fs
    .access(resource.filePath)
    .then(() => true)
    .catch(() => false);

  assert.equal(existsBeforeDelete, true);

  await deleteTempResource(resource.filePath);

  const deleted = await verifyTempResourceDeleted(resource.filePath);
  assert.equal(deleted, true);
});

test("security: unsupported file signatures are rejected", async () => {
  await assert.rejects(async () => {
    await validateUploadedFile({
      buffer: Buffer.from("not a pdf or image"),
      declaredMime: "text/plain",
    });
  });
});

test("printing: jpg signatures are accepted", async () => {
  const minimalJpg = Buffer.from([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x10,
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00,
    0x01,
    0x01,
    0x01,
    0x00,
    0x60,
    0x00,
    0x60,
    0x00,
    0x00,
    0xff,
    0xd9,
  ]);

  const result = await validateUploadedFile({
    buffer: minimalJpg,
    declaredMime: "image/jpeg",
  });

  assert.ok(["jpg", "jpeg"].includes(result.extension));
});

test("privacy: test should not persist customer names in paths", async () => {
  const resource = await createTempResource(Buffer.from("x"), "tmp");
  const fileName = path.basename(resource.filePath);

  assert.ok(!fileName.includes("customer"));

  await deleteTempResource(resource.filePath);
});
