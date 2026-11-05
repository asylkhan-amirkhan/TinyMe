import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { NotificationSound, savedSoundEnabled, savedSoundChannels } from "../lib/notification-sound";

function audioMock(t: TestContext, resume?: () => Promise<void>) {
  const contexts: FakeContext[] = [], peaks: number[] = [], stops: number[] = [];
  let starts = 0, disconnected = 0;
  class FakeContext {
    currentTime = 0; state = "suspended"; destination = {};
    constructor() { contexts.push(this); }
    async resume() { await resume?.(); this.state = "running"; }
    async close() { this.state = "closed"; }
    createOscillator() { return { type:"", frequency:{value:0}, onended:null, connect(){}, disconnect(){disconnected++;}, start(){starts++;}, stop(time = 0){stops.push(time);} }; }
    createGain() { return { gain:{setValueAtTime(){},linearRampToValueAtTime(value:number){peaks.push(value);},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}},connect(){},disconnect(){disconnected++;} }; }
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  Object.defineProperty(globalThis,"AudioContext",{configurable:true,value:FakeContext});
  t.after(() => { if(previous) Object.defineProperty(globalThis,"AudioContext",previous); else Reflect.deleteProperty(globalThis,"AudioContext"); });
  return {contexts,peaks,stops,get starts(){return starts;},get disconnected(){return disconnected;}};
}

test("notification chimes require activation, reuse context and limit burst volume", async t => {
  const mock = audioMock(t), sound = new NotificationSound(); t.after(()=>sound.dispose());
  assert.equal(sound.play("purchase"),false); assert.equal(mock.contexts.length,0);
  assert.equal(await sound.unlock(),true); assert.equal(sound.play("purchase"),true);
  assert.equal(mock.starts,6); assert.ok(Math.max(...mock.peaks)<.028);
  assert.ok(Math.max(...mock.stops)<.7);
  assert.equal(sound.play("coins"),false); assert.equal(mock.starts,6);
  mock.contexts[0].currentTime = 1;
  await sound.unlock(); assert.equal(sound.play("coins"),true);
  assert.equal(mock.starts,10); assert.equal(mock.contexts.length,1);
});
test("muting stops active chimes and suppresses future events; disposal closes audio", async t => {
  const mock = audioMock(t), sound = new NotificationSound();
  await sound.unlock(); sound.play("purchase");
  sound.setEnabled(false);
  assert.equal(mock.stops.filter(time=>time===.03).length,6);
  assert.equal(sound.play("coins"),false); assert.equal(await sound.unlock(),false);
  sound.setEnabled(true); await sound.unlock(); assert.equal(sound.play("coins"),true);
  sound.dispose(); assert.equal(mock.contexts[0].state,"closed");
  assert.ok(mock.disconnected>0); assert.equal(await sound.unlock(),false);
  assert.equal(sound.play("purchase"),false);
});
test("muting during browser resume does not replay an old notification", async t => {
  let resolve!:()=>void;
  const mock = audioMock(t,()=>new Promise<void>(done=>{resolve=done;}));
  const sound = new NotificationSound(); t.after(()=>sound.dispose());
  const pending = sound.unlock(); sound.setEnabled(false); resolve();
  assert.equal(await pending,false); assert.equal(sound.play("coins"),false); assert.equal(mock.starts,0);
});
test("saved mute is respected and autoplay rejection stays silent", async t => {
  assert.equal(savedSoundEnabled(null),true); assert.equal(savedSoundEnabled("false"),false);
  assert.equal(savedSoundEnabled("true"),true); assert.equal(savedSoundEnabled("invalid"),true);
  const mock = audioMock(t,async()=>{throw Error("NotAllowedError");});
  const sound = new NotificationSound(); t.after(()=>sound.dispose());
  assert.equal(await sound.unlock(),false); assert.equal(sound.play("purchase"),false); assert.equal(mock.starts,0);
});

test("coin mute suppresses rewards without silencing purchases or changing master mute", async t => {
  const mock = audioMock(t), sound = new NotificationSound(); t.after(() => sound.dispose());
  await sound.unlock();
  sound.setKindEnabled("coins", false);
  assert.equal(sound.play("coins"), false); assert.equal(mock.starts, 0);
  assert.equal(sound.play("purchase"), true); assert.equal(mock.starts, 6);
  sound.setEnabled(false); sound.setEnabled(true);
  assert.equal(sound.play("coins"), false);
  sound.setKindEnabled("coins", true);
  assert.equal(sound.play("coins"), true);
  sound.setKindEnabled("purchase", false);
  mock.contexts[0].currentTime = 2;
  assert.equal(sound.play("purchase"), false);
  assert.equal(sound.play("coins"), true);
});

test("muting one channel fades only its voices and blocks pending resume playback", async t => {
  const mock = audioMock(t), sound = new NotificationSound(); t.after(() => sound.dispose());
  await sound.unlock(); sound.play("purchase");
  mock.contexts[0].currentTime = .5; sound.play("coins");
  sound.setKindEnabled("coins", false);
  assert.equal(mock.stops.filter(time => time === .53).length, 4);
  const pending = sound.unlock(); sound.setKindEnabled("purchase", false);
  await pending;
  assert.equal(sound.play("purchase"), false);
});

test("channel preferences default to quiet coins and preserve explicit choices", () => {
  const defaults = { purchase: true, coins: false };
  for (const value of [null, "broken", "null", "false", "[]", '{}', '{"coins":"true"}']) {
    assert.deepEqual(savedSoundChannels(value), defaults);
  }
  const choice = { purchase: false, coins: true };
  assert.deepEqual(savedSoundChannels(JSON.stringify(choice)), choice);
  assert.deepEqual(savedSoundChannels('{"purchase":false}'), { purchase: false, coins: false });
  assert.equal(savedSoundEnabled("false"), false);
});
