import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialMusic } from '../lib/music-storage';
import { inspectWorkshopAudio, mergeWorkshopMusic, type WorkshopTrack } from '../lib/workshop-music';

const track: WorkshopTrack = { id:'workshop-track:one',title:'Evening',artist:'TinyMe',genre:'Lo-fi',description:'',color:'#aabbcc',duration:'2:00',seconds:120,size:100 };
test('published admin audio joins the user library and updates without duplicates or losing personal progress', () => {
  const original = initialMusic();
  original.stats = [{trackId:'builtin-evening',title:'Evening',day:'2026-11-12',seconds:20,plays:1,completed:0}];
  const added = mergeWorkshopMusic(original, [track]);
  assert.equal(added.tracks.find(t => t.id===track.id)?.duration,120);
  assert.ok(added.playlists[0].trackIds.includes(track.id));
  const updated = mergeWorkshopMusic(added,[{...track,title:'New title'}]);
  assert.equal(updated.tracks.filter(t=>t.id===track.id).length,1);
  assert.equal(updated.tracks.find(t=>t.id===track.id)?.title,'New title');
  assert.deepEqual(updated.stats,original.stats);
  assert.equal(original.tracks.length,1);
  assert.deepEqual(mergeWorkshopMusic({...updated,currentId:track.id},[]).playlists[0].trackIds,['builtin-evening']);
  assert.equal(mergeWorkshopMusic({...updated,currentId:track.id},[]).currentId,'builtin-evening');
});
test('audio upload rejects unsupported and empty files before creating a decoder', async () => {
  await assert.rejects(inspectWorkshopAudio(new File(['data'],'picture.png')),/MP3/);
  await assert.rejects(inspectWorkshopAudio(new File([],'empty.mp3')),/MP3/);
});
test('audio upload measures the actual file and releases its decoder on success and failure', async () => {
  const original=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
  let closed=0,fail=false;
  class Decoder {
    async decodeAudioData() { if(fail)throw Error('bad audio');return {duration:123.5}; }
    async close(){closed++;}
  }
  Object.defineProperty(globalThis,'AudioContext',{value:Decoder,configurable:true});
  try {
    assert.equal(await inspectWorkshopAudio(new File(['sample'],'music.ogg')),123.5);
    fail=true;
    await assert.rejects(inspectWorkshopAudio(new File(['broken'],'music.mp3')),/аудио/);
    assert.equal(closed,2);
  } finally {
    if(original)Object.defineProperty(globalThis,'AudioContext',original);else Reflect.deleteProperty(globalThis,'AudioContext');
  }
});
