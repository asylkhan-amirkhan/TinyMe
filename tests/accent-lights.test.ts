import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAccentLights, defaultAccentLights, lightRgb } from '../domain/accent-lights';

test('independent light switches retain all four combinations through saved JSON', () => {
  for (const garland of [false,true]) for (const desk of [false,true]) {
    const value={...defaultAccentLights,garland,desk};
    assert.deepEqual(parseAccentLights(JSON.stringify(value)),value);
  }
});

test('missing or damaged light preferences default safely without discarding an explicit off switch', () => {
  for(const raw of [null,'null','bad json','[]','42']) assert.deepEqual(parseAccentLights(raw),defaultAccentLights);
  assert.deepEqual(parseAccentLights('{"garland":false}'),{...defaultAccentLights,garland:false});
  assert.deepEqual(parseAccentLights('{"garland":"false","desk":false}'),{...defaultAccentLights,desk:false});
});


test('color, brightness and removal survive saving without changing the other light',()=>{
  const value={...defaultAccentLights,garlandInstalled:false,garlandColor:'#c4a5ff',garlandBrightness:24,deskColor:'#9de4c1',deskBrightness:72};
  assert.deepEqual(parseAccentLights(JSON.stringify(value)),value);
  assert.deepEqual(parseAccentLights(JSON.stringify({...value,garlandInstalled:true})),{...value,garlandInstalled:true});
  assert.equal(lightRgb('#c4a5ff'),'196,165,255');
});
test('invalid colors and brightness are sanitized and zero remains zero',()=>{
  const value=parseAccentLights(JSON.stringify({garlandColor:'red',deskColor:'#123',garlandBrightness:-50,deskBrightness:200}));
  assert.equal(value.garlandColor,defaultAccentLights.garlandColor);
  assert.equal(value.deskColor,defaultAccentLights.deskColor);
  assert.equal(value.garlandBrightness,0);assert.equal(value.deskBrightness,100);
  assert.equal(parseAccentLights('{"deskBrightness":"40"}').deskBrightness,100);
  assert.equal(parseAccentLights('{"deskBrightness":0}').deskBrightness,0);
});
