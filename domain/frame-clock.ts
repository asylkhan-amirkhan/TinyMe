/** Fixed cadence with deadline carry: small RAF jitter must not skip a whole frame. */
export function frameDue(now:number,next:number,interval=1000/30):{due:boolean;next:number} {
  if(next && now<next-.5)return {due:false,next};
  return {due:true,next:!next || now-next>=interval ? now+interval : next+interval};
}
