/**
 * Signed URLs for Apple Maps Web Snapshots. Apple signs the request path and
 * query with the MapKit JS private key (ES256, Base64 URL-encoded) and the
 * signature must be the last parameter. The private key stays on the server;
 * the signed URL is safe to hand to the widget, since it can only ever fetch
 * that one image.
 * Reference: developer.apple.com/documentation/snapshots/generating-a-url-and-signature-to-create-a-maps-web-snapshot
 */

import { createSign } from "node:crypto";

export const SNAPSHOT_ORIGIN = "https://snapshot.apple-mapkit.com";
const SNAPSHOT_PATH = "/api/v1/snapshot";

export interface AppleMapsCredentials {
  teamId: string;
  keyId: string;
  /** The .p8 file's contents (PEM). */
  privateKey: string;
}

/** Takes a snapshot query string (no credentials) and returns the full signed URL. */
export type SnapshotSigner = (query: string) => string;

export function createSnapshotSigner({
  teamId,
  keyId,
  privateKey,
}: AppleMapsCredentials): SnapshotSigner {
  const credentials = new URLSearchParams({ teamId, keyId }).toString();
  return (query) => {
    const path = `${SNAPSHOT_PATH}?${query}&${credentials}`;
    const signature = createSign("SHA256")
      .update(path)
      // ES256 as JOSE defines it: the raw r||s pair, not DER.
      .sign({ key: privateKey, dsaEncoding: "ieee-p1363" }, "base64url");
    return `${SNAPSHOT_ORIGIN}${path}&signature=${signature}`;
  };
}

/**
 * The signer from the environment, or null when Apple Maps is not configured,
 * in which case the widget falls back to its own map.
 */
export function snapshotSignerFromEnv(): SnapshotSigner | null {
  const teamId = process.env.APPLE_MAPS_TEAM_ID;
  const keyId = process.env.APPLE_MAPS_KEY_ID;
  const privateKey = process.env.APPLE_MAPS_PRIVATE_KEY;
  if (!teamId || !keyId || !privateKey) return null;
  // Environment settings often store the PEM on one line with literal "\n".
  return createSnapshotSigner({
    teamId,
    keyId,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  });
}
