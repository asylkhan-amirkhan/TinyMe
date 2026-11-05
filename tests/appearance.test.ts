import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appearanceOf, defaultAppearance, validAppearance } from '../domain/appearance';
import { initialRoom, placementError, mergeRoom } from '../domain/model';
test('colors accept only complete six-digit hex palettes and old saves use defaults',()=>{
 assert.equal(appearanceOf(undefined),defaultAppearance);
 for(const value of [null,{}, {wallLeft:'#123456',wallRight:'#ffffff'}, {...defaultAppearance,floor:'red'}, {...defaultAppearance,floor:'#12345678'}]) assert.equal(validAppearance(value),false);
 assert.equal(validAppearance({...defaultAppearance,floor:'#ABCdef'}),true);
});
test('rotation detects newly occupied cells and keeps boundaries',()=>{
 const room=initialRoom();const desk=room.items.find(i=>i.productId==='desk-oak')!;
 assert.equal(placementError(room.items,desk,desk.x!,desk.y!,0),null);
 assert.equal(placementError(room.items,desk,desk.x!,desk.y!,90),'Здесь уже стоит другой предмет');
 const bed=room.items.find(i=>i.productId==='bed-cloud')!;
 for(const angle of [0,90,180,270]) assert.equal(placementError(room.items,bed,bed.x!,bed.y!,angle),null);
 assert.ok(placementError([],bed,20,10,90));
});
test('room updates retain persisted appearance and newer wallet values',()=>{
 const current={...initialRoom(),appearance:defaultAppearance,balance:10,balanceRevision:3};
 const result=mergeRoom(current,{...current,balance:9,balanceRevision:2,appearance:{...defaultAppearance,floor:'#112233'}});
 assert.equal(result.balance,10);assert.equal(result.appearance!.floor,'#112233');
});
