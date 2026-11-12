import type { SkillReward } from '../domain/skill-growth';
type Pixel = { x: number; y: number; w: number; h: number; color: string };
/** Shared pixel patterns for the collection and the in-room awards. */
export function rewardPixels(template: SkillReward['template'], level: number): Pixel[] {
  const result: Pixel[] = [];
  const rect=(x:number,y:number,w:number,h:number,color:string)=>result.push({x,y,w,h,color});
  const stage = level < 6 ? 1 : level < 9 ? 2 : 3;
  const gold='#e8c780', ink='#55556f', paper='#f0e2c5', green='#9cbf98';
  if(template==='laptop') {
    rect(7,9,34,23,ink);rect(10,12,28,17,'#8daeb4');rect(16,17,stage*6,2,paper);rect(13,22,20,2,green);rect(4,32,40,5,'#b5a9bf');rect(17,32,14,2,paper);
  } else if(template==='globe') {
    rect(12,6,24,5,'#8ca9cb');rect(7,11,34,18,'#8ca9cb');rect(12,29,24,5,'#8ca9cb');rect(14,11,8,9,green);rect(24,19,11,7,green);rect(22,34,4,5,ink);rect(14,39,20,3,gold);
  } else if(template==='books') {
    rect(7,30,34,9,'#a491b9');rect(10,32,28,4,paper);rect(10,19,28,10,'#7d9f9c');rect(13,21,22,5,paper);rect(6,10,34,8,'#c9987f');rect(9,12,28,3,paper);
  } else if(template==='dumbbells') {
    rect(7,13,8,22,ink);rect(4,17,4,14,'#8b91a6');rect(15,22,18,5,'#b6bbca');rect(33,13,8,22,ink);rect(41,17,4,14,'#8b91a6');
  } else if(template==='plant') {
    rect(14,28,20,10,'#c48e79');rect(17,38,14,5,'#a8786b');rect(22,10,4,18,green);rect(10,13,12,7,green);rect(26,8,11,7,green);rect(26,20,13,6,'#789c7e');
  } else {
    rect(12,7,24,17,gold);rect(16,24,16,5,gold);rect(22,29,4,7,gold);rect(14,36,20,4,'#b49362');rect(5,10,6,12,gold);rect(37,10,6,12,gold);rect(9,21,6,4,gold);rect(33,21,6,4,gold);
  }
  if(stage>=2) { rect(4,4,4,4,gold);rect(40,4,4,4,gold); }
  if(stage>=3) { rect(21,2,6,4,gold);rect(3,39,5,3,gold);rect(40,39,5,3,gold); }
  return result;
}
export function drawRoomRewards(g: CanvasRenderingContext2D, rewards: (SkillReward&{selected?:boolean})[], project: (x:number,y:number,z?:number)=>[number,number]) {
  return rewards.slice(0,6).map((reward,index) => {
    const [x,y] = project(.15,2.4+(index%3)*4.1,index<3?205:132);
    g.save();g.translate(x-24,y-44);g.fillStyle='#544557';g.fillRect(-4,-4,56,54);g.fillStyle='#342d40';g.fillRect(-1,-1,50,48);
    for(const p of rewardPixels(reward.template,reward.level)) {g.fillStyle=p.color;g.fillRect(p.x,p.y,p.w,p.h);}
    g.fillStyle='#dfc493';g.fillRect(-6,48,60,5);
    if(reward.selected){g.strokeStyle='#f3dc9c';g.lineWidth=2;g.strokeRect(-6,-6,60,61);}
    g.restore();
    const path=new Path2D();path.rect(x-28,y-48,56,58);
    return { id:`skill-reward:${reward.id}`,path };
  });
}
