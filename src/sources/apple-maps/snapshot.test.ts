import { createVerify, generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createSnapshotSigner, snapshotSignerFromEnv } from "./snapshot";

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

describe("createSnapshotSigner", () => {
  const sign = createSnapshotSigner({
    teamId: "TEAM1",
    keyId: "KEY1",
    privateKey,
  });
  const url = sign("center=51.5%2C-0.1&size=640x320");

  it("builds the snapshot URL with the credentials after the query and the signature last", () => {
    expect(
      url.startsWith(
        "https://snapshot.apple-mapkit.com/api/v1/snapshot?center=51.5%2C-0.1&size=640x320&teamId=TEAM1&keyId=KEY1&signature=",
      ),
    ).toBe(true);
    expect(new URL(url).searchParams.get("signature")).toMatch(
      /^[A-Za-z0-9_-]+$/,
    );
  });

  it("signs the path and query with ES256 so Apple can verify it", () => {
    const [path, signature] = url
      .replace("https://snapshot.apple-mapkit.com", "")
      .split("&signature=");
    const ok = createVerify("SHA256")
      .update(path)
      .verify(
        { key: publicKey, dsaEncoding: "ieee-p1363" },
        signature,
        "base64url",
      );
    expect(ok).toBe(true);
  });
});

describe("snapshotSignerFromEnv", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("is null until every credential is set", () => {
    delete process.env.APPLE_MAPS_TEAM_ID;
    delete process.env.APPLE_MAPS_KEY_ID;
    delete process.env.APPLE_MAPS_PRIVATE_KEY;
    expect(snapshotSignerFromEnv()).toBeNull();
    process.env.APPLE_MAPS_TEAM_ID = "TEAM1";
    process.env.APPLE_MAPS_KEY_ID = "KEY1";
    expect(snapshotSignerFromEnv()).toBeNull();
  });

  it("accepts a key stored on one line with escaped newlines", () => {
    process.env.APPLE_MAPS_TEAM_ID = "TEAM1";
    process.env.APPLE_MAPS_KEY_ID = "KEY1";
    process.env.APPLE_MAPS_PRIVATE_KEY = privateKey.replace(/\n/g, "\\n");
    const sign = snapshotSignerFromEnv();
    expect(sign).not.toBeNull();
    expect(sign!("center=auto")).toContain("&keyId=KEY1&signature=");
  });
});
