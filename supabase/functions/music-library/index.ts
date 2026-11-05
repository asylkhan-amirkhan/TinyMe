import { createClient } from "npm:@supabase/supabase-js@2.95.3";
import { parseBuffer } from "npm:music-metadata@11.12.1";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });
const url = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = admin.storage.from("myroom-music");
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function must<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
async function library(userId: string) {
  must(
    await admin
      .from("music_libraries")
      .upsert(
        { user_id: userId },
        { onConflict: "user_id", ignoreDuplicates: true },
      ),
  );
  const [l, t] = await Promise.all([
    admin.from("music_libraries").select("*").eq("user_id", userId).single(),
    admin
      .from("music_tracks")
      .select("id,title,bytes,duration,content_hash")
      .eq("user_id", userId)
      .eq("status", "ready")
      .order("created_at"),
  ]);
  return { library: must(l), tracks: must(t) };
}
async function cleanup(userId: string) {
  const rows = must(
    await admin
      .from("music_tracks")
      .select("id,storage_key,status")
      .eq("user_id", userId)
      .in("status", ["uploading", "validating", "failed", "deleting"])
      .lt("expires_at", new Date().toISOString())
      .limit(10),
  );
  for (const row of rows) {
    const claimed = must(
      await admin
        .from("music_tracks")
        .update({ status: "deleting" })
        .eq("id", row.id)
        .eq("user_id", userId)
        .in("status", ["uploading", "validating", "failed", "deleting"])
        .lt("expires_at", new Date().toISOString())
        .select("id"),
    );
    if (!claimed.length) continue;
    const removed = await bucket.remove([row.storage_key]);
    if (!removed.error)
      await admin
        .from("music_tracks")
        .delete()
        .eq("id", row.id)
        .eq("user_id", userId)
        .eq("status", "deleting");
  }
}
async function fingerprint(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function assertUniqueAudio(userId: string, id: string, hash: string, size: number) {
  const known = must(await admin.from("music_tracks").select("id")
    .eq("user_id", userId).eq("status", "ready").eq("content_hash", hash)
    .neq("id", id).limit(1));
  if (known.length) throw Error("DUPLICATE_AUDIO");
  // Old uploads have no fingerprint yet. Compare only equal-size candidates,
  // one at a time, and cache verified hashes for subsequent uploads.
  const legacy = must(await admin.from("music_tracks").select("id,storage_key")
    .eq("user_id", userId).eq("status", "ready").eq("bytes", size)
    .is("content_hash", null).neq("id", id));
  for (const candidate of legacy) {
    const file = must(await bucket.download(candidate.storage_key));
    const candidateHash = await fingerprint(await file.arrayBuffer());
    const cached = await admin.from("music_tracks").update({ content_hash: candidateHash })
      .eq("id", candidate.id).eq("user_id", userId).eq("status", "ready")
      .is("content_hash", null);
    // Legacy duplicates remain intact; the first copy owns the unique hash.
    if (cached.error && cached.error.code !== "23505") throw cached.error;
    if (candidateHash === hash) throw Error("DUPLICATE_AUDIO");
  }
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST")
    return respond({ error: "METHOD_NOT_ALLOWED" }, 405);
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond({ error: "UNAUTHORIZED" }, 401);
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user) return respond({ error: "UNAUTHORIZED" }, 401);
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 524288)
      return respond({ error: "PAYLOAD_TOO_LARGE" }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return respond({ error: "INVALID_JSON" }, 400);
  } catch {
    return respond({ error: "INVALID_JSON" }, 400);
  }
  try {
    const action = body.action;
    if (action === "load") {
      await cleanup(user.id);
      return respond(await library(user.id));
    }
    if (action === "save") {
      const revision = body.revision;
      if (
        !Number.isSafeInteger(revision) ||
        typeof body.selected !== "string" ||
        !Array.isArray(body.playlists)
      )
        return respond({ error: "INVALID_PAYLOAD" }, 400);
      const data = must(
        await admin.rpc("music_save_library", {
          p_user: user.id,
          p_revision: revision,
          p_playlists: body.playlists,
          p_selected: body.selected,
        }),
      );
      return respond({ library: data });
    }
    if (typeof body.id !== "string" || !uuid.test(body.id))
      return respond({ error: "INVALID_ID" }, 400);
    const id = body.id;
    if (action === "reserve") {
      if (
        typeof body.title !== "string" ||
        body.title.length < 1 ||
        body.title.length > 160 ||
        !Number.isSafeInteger(body.bytes)
      )
        return respond({ error: "INVALID_FILE" }, 400);
      if (body.contentHash !== undefined) {
        if (typeof body.contentHash !== "string" || !/^[0-9a-f]{64}$/.test(body.contentHash))
          return respond({ error: "INVALID_FILE" }, 400);
        await assertUniqueAudio(user.id, id, body.contentHash, body.bytes as number);
      }
      await cleanup(user.id);
      const track = must(
        await admin.rpc("music_reserve", {
          p_user: user.id,
          p_id: id,
          p_title: body.title,
          p_bytes: body.bytes,
          p_mime: body.mime,
        }),
      );
      if (track.status === "ready") return respond({ track, ready: true });
      if (track.status !== "uploading")
        return respond({ error: "UPLOAD_NOT_AVAILABLE" }, 409);
      // Do not extend the upload-token lifetime by repeatedly reserving an old ID.
      if (Date.now() - new Date(track.created_at).getTime() > 300000)
        return respond({ error: "UPLOAD_EXPIRED" }, 409);
      const signed = must(
        await bucket.createSignedUploadUrl(track.storage_key, {
          upsert: false,
        }),
      );
      return respond({ path: track.storage_key, token: signed.token });
    }
    const track = must(
      await admin
        .from("music_tracks")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    );
    if (!track) return respond({ error: "NOT_FOUND" }, 404);
    if (action === "playback") {
      if (track.status !== "ready")
        return respond({ error: "TRACK_NOT_READY" }, 409);
      const signed = must(await bucket.createSignedUrl(track.storage_key, 900));
      return respond({ url: signed.signedUrl });
    }
    if (action === "delete") {
      const path = must(
        await admin.rpc("music_remove_track", { p_user: user.id, p_id: id }),
      );
      must(await bucket.remove([path]));
      return respond(await library(user.id));
    }
    if (action === "complete") {
      if (track.status === "ready") return respond({ track });
      if (
        track.status !== "uploading" ||
        new Date(track.expires_at).getTime() < Date.now()
      )
        return respond({ error: "UPLOAD_EXPIRED" }, 409);
      const claimed = must(
        await admin
          .from("music_tracks")
          .update({ status: "validating" })
          .eq("id", id)
          .eq("user_id", user.id)
          .eq("status", "uploading")
          .select("id"),
      );
      if (claimed.length !== 1)
        return respond({ error: "VALIDATION_IN_PROGRESS" }, 409);
      try {
        const file = must(await bucket.download(track.storage_key));
        if (file.size !== track.bytes || file.size > 52428800)
          throw Error("FILE_SIZE_MISMATCH");
        const bytes = new Uint8Array(await file.arrayBuffer());
        // Never trust the client's preflight fingerprint as proof of content.
        const contentHash = await fingerprint(bytes.buffer);
        await assertUniqueAudio(user.id, id, contentHash, file.size);
        const wav =
          bytes.length > 12 &&
          new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" &&
          new TextDecoder().decode(bytes.subarray(8, 12)) === "WAVE";
        const mp3 =
          bytes.length > 3 &&
          ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
            (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
        if (
          (track.mime === "audio/wav" && !wav) ||
          (track.mime === "audio/mpeg" && !mp3)
        )
          throw Error("INVALID_AUDIO_SIGNATURE");
        const info = await parseBuffer(
          bytes,
          { mimeType: track.mime, size: bytes.byteLength },
          { duration: true, skipCovers: true },
        );
        const duration = info.format.duration;
        if (!duration || !Number.isFinite(duration) || duration <= 0)
          throw Error("INVALID_AUDIO_DURATION");
        const result = await admin
            .from("music_tracks")
            .update({ duration, status: "ready", content_hash: contentHash })
            .eq("id", id)
            .eq("user_id", user.id)
            .eq("status", "validating")
            .select("*")
            .maybeSingle();
        if (result.error?.code === "23505") throw Error("DUPLICATE_AUDIO");
        const ready = must(result);
        if (!ready) throw Error("UPLOAD_CANCELLED");
        return respond({ track: ready });
      } catch (e) {
        const removed = await bucket.remove([track.storage_key]);
        // Keep the reservation until all issued upload tokens have expired.
        await admin
          .from("music_tracks")
          .update({ status: "deleting" })
          .eq("id", id)
          .eq("user_id", user.id)
          .neq("status", "ready");
        throw e;
      }
    }
    return respond({ error: "INVALID_ACTION" }, 400);
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : ((e as { message?: string })?.message ?? "REQUEST_FAILED");
    const allowed = [
      "LIBRARY_CONFLICT",
      "QUOTA_EXCEEDED",
      "TOO_MANY_UPLOADS",
      "IDEMPOTENCY_MISMATCH",
      "INVALID_FILE",
      "INVALID_PLAYLISTS",
      "INVALID_PLAYLIST",
      "DUPLICATE_TRACK",
      "DUPLICATE_AUDIO",
      "TRACK_NOT_FOUND",
      "INVALID_SELECTION",
      "INVALID_AUDIO_SIGNATURE",
      "INVALID_AUDIO_DURATION",
      "FILE_SIZE_MISMATCH",
      "UPLOAD_CANCELLED",
      "NOT_FOUND",
    ];
    const code = allowed.includes(message) ? message : "MUSIC_REQUEST_FAILED";
    console.error("music-library", actionForLog(body.action), code);
    return respond({ error: code }, code === "LIBRARY_CONFLICT" ? 409 : 422);
  }
});
function actionForLog(action: unknown) {
  return typeof action === "string" ? action.slice(0, 20) : "unknown";
}
