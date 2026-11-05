import { dimensions, productOf, type Item } from './model';
import { advanceResidentPose, angleDelta, residentPose, WALK_SPEED, type ResidentPose } from './resident-motion';

export type ResidentMode = 'auto' | 'direct' | 'paused' | 'hidden';
export type ResidentAction = 'walk' | 'work' | 'read' | 'water' | 'rest' | 'listen';
export type Cell = { x: number; y: number };
export type ResidentTarget = Cell & { action: ResidentAction; itemId?: string; seatId?: string; seatHeight?: number; workReach?:number; facing: number; seated: boolean };
export type Resident = Cell & { facing: number; action: ResidentAction | 'idle'; path: Cell[]; target: ResidentTarget | null;
  elapsed: number; time: number; cycle: number; seated: boolean; visible: boolean; pose?: ResidentPose };
export type ResidentCommand = { key: number; action?: ResidentAction; itemId?: string; cell?: Cell };

/** Compare floor footprints before using diagonal depth for overlapping bounds. */
export function residentBehindFurniture(position:Cell,item:Item) {
  if(item.x===null || item.y===null)return false;
  const d=dimensions(productOf(item),item.rotation);
  if(position.x>=item.x+d.w || position.y>=item.y+d.h)return false;
  if(position.x<item.x || position.y<item.y)return true;
  return position.x+position.y<item.x+item.y+(d.w+d.h)/2;
}
const W = 24, H = 16;
const key = (p: Cell) => Math.floor(p.y) * W + Math.floor(p.x);
const center = (n: number): Cell => ({ x: n % W + .5, y: Math.floor(n / W) + .5 });
const inside = (p: Cell) => p.x >= 0 && p.x < W && p.y >= 0 && p.y < H;
const floorItems = (items: Item[]) => items.filter(i => i.x !== null && i.y !== null && !i.parentId && productOf(i).surface === 'floor');

export function residentBlocked(items: Item[], allowed: string[] = []): Set<number> {
  const blocked = new Set<number>();
  for (const item of floorItems(items)) {
    if (allowed.includes(item.id)) continue;
    const d = dimensions(productOf(item), item.rotation);
    for (let y = Math.floor(item.y!); y < item.y! + d.h; y++) for (let x = Math.floor(item.x!); x < item.x! + d.w; x++) {
      if (inside({ x, y })) blocked.add(y * W + x);
    }
  }
  return blocked;
}
export function residentPath(from: Cell, to: Cell, blocked: Set<number>): Cell[] | null {
  if (!inside(from) || !inside(to) || blocked.has(key(from)) || blocked.has(key(to))) return null;
  const queue = [key(from)], visited = new Map<number, number>([[key(from), -1]]);
  for (let index = 0; index < queue.length; index++) {
    const n = queue[index];
    if (n === key(to)) {
      const route: Cell[] = [];
      for (let k = n; visited.get(k)! !== -1; k = visited.get(k)!) route.push(center(k));
      route.reverse();
      // Align to the cell centre before turning; prevents cutting furniture corners.
      const start = center(key(from));
      if (Math.hypot(start.x - from.x, start.y - from.y) > .01) route.unshift(start);
      const end = route.at(-1) ?? from;
      if (Math.hypot(end.x - to.x, end.y - to.y) > .01) route.push({ x: to.x, y: to.y });
      return route;
    }
    const p = center(n);
    for (const next of [{ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }]) {
      const k = key(next);
      if (inside(next) && !blocked.has(k) && !visited.has(k)) { visited.set(k, n); queue.push(k); }
    }
  }
  return null;
}
function nearestFree(from: Cell, blocked: Set<number>): Cell | undefined {
  return Array.from({ length: W * H }, (_, n) => center(n)).filter(p => !blocked.has(key(p)))
    .sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
}
export function createResident(items: Item[]): Resident {
  const p = nearestFree({ x: 14.5, y: 8.5 }, residentBlocked(items));
  return { ...(p ?? { x: 14.5, y: 8.5 }), facing: -Math.PI / 2, action: 'idle', path: [], target: null,
    elapsed: 2, time: 0, cycle: 0, seated: false, visible: !!p };
}
const itemCenter = (item: Item) => { const d = dimensions(productOf(item), item.rotation); return { x: item.x! + d.w / 2, y: item.y! + d.h / 2 }; };
function localPoint(item: Item, x: number, y: number): Cell {
  const p = productOf(item), r = (item.rotation + 360) % 360;
  const [dx, dy] = r === 90 ? [p.h - y, x] : r === 180 ? [p.w - x, p.h - y] : r === 270 ? [y, p.w - x] : [x, y];
  return { x: item.x! + dx, y: item.y! + dy };
}
export function residentTargets(items: Item[], action?: ResidentAction, itemId?: string): ResidentTarget[] {
  const roots = floorItems(items), targets: ResidentTarget[] = [];
  // Prefer the lounge furniture over the office chair for a deliberate rest.
  if (action === 'rest') roots.sort((a, b) => {
    const rank = (i: Item) => ['sofa', 'armchair', 'ottoman', 'chair', 'bed'].indexOf(productOf(i).kind);
    return rank(a) - rank(b);
  });
  for (const item of roots) {
    if (itemId && item.id !== itemId) continue;
    const p = productOf(item);
    const activity: ResidentAction | undefined = p.kind === 'desk' ? 'work' : p.kind === 'shelf' ? 'read' : p.kind === 'plant' ? 'water' :
      ['sofa', 'armchair', 'chair', 'bed', 'ottoman'].includes(p.kind) ? 'rest' : p.kind === 'record' ? 'listen' : undefined;
    if (!activity || (action && action !== activity)) continue;
    const c = itemCenter(item), front = localPoint(item, p.w / 2, p.h + .5);
    if (activity === 'work') {
      const keyboard=localPoint(item,1.9,1.35);
      const chair = roots.filter(i => {
        if (productOf(i).kind !== 'chair') return false;
        const seat = itemCenter(i);
        // A nearby seat behind the monitors is not a usable workstation.
        const inFront = (seat.x-c.x)*(front.x-c.x)+(seat.y-c.y)*(front.y-c.y)>0;
        return inFront && Math.hypot(seat.x-keyboard.x,seat.y-keyboard.y)<=1.9;
      })
        .sort((a, b) => Math.hypot(itemCenter(a).x - front.x, itemCenter(a).y - front.y) - Math.hypot(itemCenter(b).x - front.x, itemCenter(b).y - front.y))[0];
      if (chair && Math.hypot(itemCenter(chair).x - front.x, itemCenter(chair).y - front.y) < 3) {
        const seat = itemCenter(chair),facing = Math.atan2(keyboard.y - seat.y, keyboard.x - seat.x);
        targets.push({ x: seat.x, y: seat.y,
          action: activity, itemId: item.id, seatId: chair.id, seatHeight:37,
          workReach:Math.max(.8,Math.min(1.75,Math.hypot(keyboard.x-seat.x,keyboard.y-seat.y)-.15)),facing, seated: true });
      }
    }
    if (activity === 'rest' && p.kind !== 'bed') {
      targets.push({ ...localPoint(item, p.w / 2, p.h - .55), action: activity, itemId: item.id, seatId: item.id,
        seatHeight: p.kind === 'ottoman' ? 28 : 38,
        facing: Math.atan2(front.y - c.y, front.x - c.x), seated: true });
    }
    const d = dimensions(p, item.rotation);
    const edges: Cell[] = [];
    for (let x = item.x!; x < item.x! + d.w; x++) edges.push({ x: x + .5, y: item.y! - .5 }, { x: x + .5, y: item.y! + d.h + .5 });
    for (let y = item.y!; y < item.y! + d.h; y++) edges.push({ x: item.x! - .5, y: y + .5 }, { x: item.x! + d.w + .5, y: y + .5 });
    // Read beside the shelf, facing the open room, rather than disappearing behind it.
    edges.sort((a, b) => (activity === 'read' ? b.x + b.y - a.x - a.y : 0) ||
      Math.hypot(a.x - front.x, a.y - front.y) - Math.hypot(b.x - front.x, b.y - front.y));
    // Working from the back or side of a monitor makes the hands pass through it.
    const interactionEdges=activity==='work'?edges.filter(edge=>{
      const nearest=localPoint(item,p.w/2,p.h+.5);
      return Math.abs(edge.x-nearest.x)<.01 || Math.abs(edge.y-nearest.y)<.01;
    }):edges;
    for (const edge of interactionEdges) targets.push({ ...edge, action: activity, itemId: item.id,
      facing: Math.atan2(c.y - edge.y, c.x - edge.x) + (activity === 'read' ? Math.PI : 0), seated: false });
  }
  return targets;
}

/** Rebuild plans after furnishing changes; never leave a resident inside a new obstacle. */
export function reconcileResident(current: Resident, items: Item[]): Resident {
  const targetValid = !current.target?.itemId || items.some(i => i.id === current.target!.itemId && i.x !== null && i.y !== null);
  const seatValid = current.target?.seatId && items.some(i => i.id === current.target!.seatId && i.x !== null && i.y !== null);
  const blocked = residentBlocked(items, seatValid ? [current.target!.seatId!] : []);
  const p = blocked.has(key(current)) || !current.visible ? nearestFree(current, residentBlocked(items)) : current;
  if (!p) return { ...current, visible: false, path: [], target: null, action: 'idle', seated: false, pose: undefined };
  // A changed layout invalidates all routes and seating, including rotated chairs.
  const free = nearestFree(p, residentBlocked(items));
  return { ...current, ...(free ?? p), visible: true, path: [], target: null, action: 'idle', seated: false, pose: undefined, elapsed: targetValid ? 1 : 0 };
}

export function commandResident(current: Resident, items: Item[], command: Omit<ResidentCommand, 'key'>): Resident | null {
  if (!current.visible) return null;
  let targets = command.cell ? [{ ...command.cell, action: 'walk' as const, facing: current.facing, seated: false }] : residentTargets(items, command.action, command.itemId);
  if (command.action === 'walk' && !command.cell) {
    targets = Array.from({ length: W * H }, (_, n) => ({ ...center(n), action: 'walk' as const, facing: current.facing, seated: false }))
      .sort((a, b) => Math.abs(key(a) - ((current.cycle * 97 + 218) % (W * H))) - Math.abs(key(b) - ((current.cycle * 97 + 218) % (W * H))));
  }
  const seats = floorItems(items).filter(i => ['chair', 'sofa', 'armchair', 'ottoman'].includes(productOf(i).kind));
  const currentSeat = seats.find(i => { const d = dimensions(productOf(i), i.rotation);
    return current.x >= i.x! && current.x < i.x! + d.w && current.y >= i.y! && current.y < i.y! + d.h; });
  const entries = (seat: Item) => { const p = productOf(seat); return [localPoint(seat,p.w/2,p.h+.5),localPoint(seat,-.5,p.h/2),localPoint(seat,p.w+.5,p.h/2)]; };
  for (const target of targets) {
    if (Math.hypot(current.x - target.x, current.y - target.y) < .01)
      return { ...current, pose: residentPose(current), target, path: [], seated: target.seated, action: target.action === 'walk' ? 'idle' : target.action,
        facing: target.facing, elapsed: 0, cycle: current.cycle + 1 };
    const seat = seats.find(i => i.id === target.seatId);
    for(const from of currentSeat?entries(currentSeat):[current])for(const to of seat?entries(seat):[target]) {
    // Get off the current seat and approach the new seat from its front, never through a backrest.
    const leaving = currentSeat ? residentPath(current, from, residentBlocked(items, [currentSeat.id])) : [];
    const walking = residentPath(from, to, residentBlocked(items));
    const sitting = seat ? residentPath(to, target, residentBlocked(items, [seat.id])) : [];
    if (leaving && walking && sitting) return { ...current, pose: residentPose(current), target, path: [...leaving, ...walking, ...sitting],
      seated: false, action: 'walk', elapsed: 0, cycle: current.cycle + 1 };
    }
  }
  return null;
}
export function advanceResident(current: Resident, deltaMs: number, items: Item[], automatic: boolean): Resident {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return current;
  const duration = Math.min(deltaMs, 150) / 1000;
  let r = { ...current, path: [...current.path], pose: { ...residentPose(current) } };
  // Small simulation steps make acceleration and braking independent of paint cadence.
  for (let remaining = duration; remaining > 1e-8;) {
    const dt = Math.min(remaining, 1 / 60); remaining -= dt;
    r.time += dt; r.elapsed += dt;
    while (r.path[0] && Math.hypot(r.path[0].x - r.x, r.path[0].y - r.y) < 1e-7) r.path.shift();
    let routeLength = 0, from: Cell = r;
    for (const p of r.path) { routeLength += Math.hypot(p.x - from.x, p.y - from.y); from = p; }
    const next = r.path[0];
    if (next && Math.hypot(next.x - r.x, next.y - r.y) > 1e-8) r.facing = Math.atan2(next.y - r.y, next.x - r.x);
    const alignment = Math.max(.25, (1 + Math.cos(angleDelta(r.pose.facing, r.facing))) / 2);
    let desired = Math.min(WALK_SPEED * alignment, Math.sqrt(2 * 7.2 * routeLength));
    // Ease into a corner, but stay on the collision-checked route instead of cutting across it.
    if (next && r.path[1]) {
      const a = Math.atan2(next.y - r.y, next.x - r.x), b = Math.atan2(r.path[1].y - next.y, r.path[1].x - next.x);
      const cornerSpeed = WALK_SPEED * Math.max(.35, Math.cos(angleDelta(a, b) / 2) ** 2);
      desired = Math.min(desired, Math.sqrt(cornerSpeed ** 2 + 14.4 * Math.hypot(next.x - r.x, next.y - r.y)));
    }
    // Finish standing before leaving a chair; a new command can still interrupt any pose.
    if (r.pose.seated > .08 && !r.seated) desired = 0;
    const oldSpeed = r.pose.speed;
    let speed = oldSpeed + Math.max(-7.2 * dt, Math.min(6 * dt, desired - oldSpeed));
    let distance = Math.min(routeLength, (oldSpeed + speed) * .5 * dt), travelled = 0;
    while (r.path.length && distance > 1e-8) {
      const p = r.path[0], dx = p.x - r.x, dy = p.y - r.y, length = Math.hypot(dx, dy);
      if (length <= distance) { r.x = p.x; r.y = p.y; r.path.shift(); distance -= length; travelled += length; }
      else { r.x += dx / length * distance; r.y += dy / length * distance; travelled += distance; distance = 0; }
    }
    if (!r.path.length) {
      speed = 0;
      if (r.target && r.action === 'walk') {
        r = { ...r, action: r.target.action === 'walk' ? 'idle' : r.target.action,
          facing: r.target.action === 'walk' ? r.facing : r.target.facing, seated: r.target.seated, elapsed: 0 };
      }
    }
    r.pose = advanceResidentPose(r.pose, r, dt, travelled, speed);
  }
  if (automatic && !r.path.length && r.elapsed > (r.action === 'idle' ? 4 : 16)) {
    const activities: ResidentAction[] = ['work', 'read', 'water', 'rest', 'listen', 'walk'];
    const nextActivity = r.action === 'idle' ? r.cycle % activities.length : (activities.indexOf(r.action) + 1) % activities.length;
    for (let n = 0; n < activities.length; n++) {
      const plan = commandResident(r, items, { action: activities[(nextActivity + n) % activities.length] });
      if (plan) return plan;
    }
    r.elapsed = 0;
  }
  return r;
}
export function residentStatus(r: Resident): string {
  if (!r.visible) return 'Нужно свободное место на полу';
  if (r.path.length) return 'Идёт к месту';
  return { idle: 'Осматривается', walk: 'Прогуливается', work: 'Работает за компьютером', read: 'Читает книгу', water: 'Поливает растение', rest: 'Отдыхает', listen: 'Слушает музыку' }[r.action];
}
