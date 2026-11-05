import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCloudMusic } from "../lib/music-cloud";
import { initialMusic } from "../lib/music-storage";
import { addToPlaylist, addUploadedTracks, listenedDelta, anotherMusicPlayer } from "../lib/music-behavior";

test("uploads go to the selected playlist and remain in the full collection", () => {
  const state = initialMusic();
  state.playlists.push({ id: "romantic", name: "Romantic", trackIds: [] });
  const track = { id: "song", title: "Imported song", duration: 204, size: 100 };
  const next = addUploadedTracks(state, [track], "romantic");
  assert.deepEqual(next.playlists[0].trackIds, ["builtin-evening", "song"]);
  assert.deepEqual(next.playlists[1].trackIds, ["song"]);
  assert.equal(state.tracks.length, 1);
  const duplicate = addUploadedTracks(next, [track], "romantic");
  assert.equal(duplicate.tracks.length, 2);
  assert.deepEqual(duplicate.playlists[1].trackIds, ["song"]);
  const onlyCollection = addUploadedTracks(state, [track]);
  assert.deepEqual(onlyCollection.playlists[1].trackIds, []);
  assert.deepEqual(addToPlaylist(next, "romantic", ["missing", "song"]).playlists[1].trackIds, ["song"]);
  assert.equal(addToPlaylist(next, "all", ["song"]), next);
});

test("background listening counts media progress, never pause, seeking or frozen gaps", () => {
  assert.equal(listenedDelta(60, 60, true), 60);
  assert.equal(listenedDelta(60, 45, true), 45);
  assert.equal(listenedDelta(.5, .5, true), .5);
  assert.equal(listenedDelta(60, 60, false), 0);
  assert.equal(listenedDelta(1, 100, true), 0);
  assert.equal(listenedDelta(20, -10, true), 0);
  assert.equal(listenedDelta(120, 120, true), 0);
  assert.equal(listenedDelta(NaN, 1, true), 0);
});

test("music ownership survives throttled heartbeats and tolerates corrupt storage", () => {
  assert.equal(anotherMusicPlayer('{"id":"mine","at":0}', "mine"), false);
  assert.equal(anotherMusicPlayer('{"id":"other","at":0}', "mine"), true);
  assert.equal(anotherMusicPlayer(null, "mine"), false);
  assert.equal(anotherMusicPlayer('invalid', "mine"), false);
  assert.equal(anotherMusicPlayer('{}', "mine"), false);
});
test("cloud library replaces local files while preserving listening history", () => {
  const local = initialMusic();
  local.tracks.push({ id: "local-only", title: "Local", duration: 1, size: 1 });
  local.currentId = "local-only";
  local.stats = [
    {
      trackId: "local-only",
      title: "Local",
      day: "2026-10-24",
      seconds: 1,
      plays: 1,
      completed: 1,
    },
  ];
  const state = mergeCloudMusic(local, {
    library: { revision: 3, playlists: [], selected_playlist: "all" },
    tracks: [{ id: "remote", title: "Cloud", duration: 48, bytes: 1024 }],
  });
  assert.deepEqual(
    state.tracks.map((t) => t.id),
    ["builtin-evening", "remote"],
  );
  assert.equal(state.currentId, "builtin-evening");
  assert.equal(state.tracks[1].cloud, true);
  assert.deepEqual(state.stats, local.stats);
  assert.deepEqual(state.playlists[0].trackIds, ["builtin-evening", "remote"]);
});
