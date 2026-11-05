import type { Resident } from './resident';

/** Ephemeral animation state; room saves and the character's outfit stay unchanged. */
export type ResidentPose = {
  facing: number;
  speed: number;
  stride: number;
  walking: number;
  seated: number;
  seatHeight: number;
  seatId?: string;
  work: number;
  read: number;
  water: number;
  listen: number;
};

export const WALK_SPEED = 2.4;
export const angleDelta = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const damp = (from: number, to: number, rate: number, dt: number) => from + (to - from) * -Math.expm1(-rate * dt);

export function residentPose(r: Resident): ResidentPose {
  if (r.pose) return r.pose;
  const walking = r.path.length > 0;
  return {
    facing: r.facing, speed: walking ? WALK_SPEED : 0, stride: r.time * 8.5,
    walking: Number(walking), seated: Number(r.seated), seatHeight: r.target?.seatHeight ?? 37,
    seatId: r.seated ? r.target?.seatId : undefined,
    work: Number(!walking && r.action === 'work'), read: Number(!walking && r.action === 'read'),
    water: Number(!walking && r.action === 'water'), listen: Number(!walking && r.action === 'listen'),
  };
}

export function advanceResidentPose(previous: ResidentPose, r: Resident, dt: number, distance: number, speed: number): ResidentPose {
  const turn = angleDelta(previous.facing, r.facing) * -Math.expm1(-10 * dt);
  const active = !r.path.length;
  return {
    facing: previous.facing + Math.max(-8 * dt, Math.min(8 * dt, turn)),
    speed,
    // Distance, rather than wall-clock time, keeps footsteps in sync with easing.
    stride: previous.stride + distance * 8.5 / WALK_SPEED,
    walking: damp(previous.walking, active ? 0 : speed / WALK_SPEED, 10, dt),
    seated: damp(previous.seated, Number(r.seated), 6, dt),
    seatHeight: r.seated ? r.target?.seatHeight ?? 37 : previous.seatHeight,
    seatId: r.seated ? r.target?.seatId : previous.seated > .08 ? previous.seatId : undefined,
    work: damp(previous.work, Number(active && r.action === 'work'), 7, dt),
    read: damp(previous.read, Number(active && r.action === 'read'), 7, dt),
    water: damp(previous.water, Number(active && r.action === 'water'), 7, dt),
    listen: damp(previous.listen, Number(active && r.action === 'listen'), 7, dt),
  };
}
