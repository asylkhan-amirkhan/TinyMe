import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validFurnitureColor, materialColor, furnitureBaseColor } from '../domain/furniture-color';
import { initialRoom, catalog } from '../domain/model';
import { furnishStudio } from '../domain/studio-layout';
test('furniture colors validate hex and explicit reset, rejecting malformed values',()=>{
 for(const value of [null,'#123456','#AbCdEf']) assert.equal(validFurnitureColor(value),true);
 for(const value of [undefined,'red','#fff','#12345678',123,{}]) assert.equal(validFurnitureColor(value),false);
});
test('material tint preserves original defaults and clamps light and shadow shades',()=>{
 assert.equal(materialColor(null,'#123456'), '#123456');
 assert.equal(materialColor(undefined,'#123456'), '#123456');
 assert.equal(materialColor('#fefefe','#123456',20), '#ffffff');
 assert.equal(materialColor('#010101','#123456',-20), '#000000');
 for(const p of catalog) assert.ok(validFurnitureColor(furnitureBaseColor(p)));
});
test('legacy furnishing preserves an owned pieces custom finish',()=>{
 const old=initialRoom();old.layoutVersion=undefined;old.items[0].color='#abcdef';
 assert.equal(furnishStudio(old).items[0].color,'#abcdef');
});
