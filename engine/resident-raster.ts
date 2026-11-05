export type RasterVertex = [x: number, y: number, depth: number];
export type RasterFace = { points: RasterVertex[]; rgb: number[]; vertexColors?: number[][] };

/** Orthographic depth buffer. Intersecting hair, clothing and facial details must
 * be resolved per pixel, not by the average depth of a whole polygon. */
export function rasterResident(faces: RasterFace[], width: number, height: number, pixels: Uint8ClampedArray, depth: Float32Array) {
  pixels.fill(0); depth.fill(-Infinity);
  for (const { points, rgb, vertexColors } of faces) for (let i=1;i<points.length-1;i++) {
    const a=points[0], b=points[i], c=points[i+1];
    const ca=vertexColors?.[0],cb=vertexColors?.[i],cc=vertexColors?.[i+1];
    const area=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(area)<1e-8) continue;
    const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))), maxX=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])));
    const minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))), maxY=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
    for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
      const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/area;
      const v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/area, w=1-u-v;
      if(u<-.00001||v<-.00001||w<-.00001)continue;
      const z=u*a[2]+v*b[2]+w*c[2], index=y*width+x;
      if(z<depth[index]-.00001)continue;
      depth[index]=z;const p=index*4;
      for(let channel=0;channel<3;channel++)pixels[p+channel]=ca&&cb&&cc?u*ca[channel]+v*cb[channel]+w*cc[channel]:rgb[channel];
      pixels[p+3]=255;
    }
  }
}
type Buffer = { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; image: ImageData; depth: Float32Array };
const buffers = new WeakMap<CanvasRenderingContext2D, Buffer>();
export function paintResidentMesh(g: CanvasRenderingContext2D, faces: RasterFace[]) {
  if(!faces.length)return;
  const vertices=faces.flatMap(f=>f.points);
  const left=Math.floor(Math.min(...vertices.map(p=>p[0])))-1, top=Math.floor(Math.min(...vertices.map(p=>p[1])))-1;
  const right=Math.ceil(Math.max(...vertices.map(p=>p[0])))+1, bottom=Math.ceil(Math.max(...vertices.map(p=>p[1])))+1;
  // Supersampling keeps the small in-room silhouette smooth at retina resolution.
  const scale=Math.min(2,Math.max(1,Math.abs(g.getTransform().a))), width=Math.ceil((right-left)*scale/32)*32, height=Math.ceil((bottom-top)*scale/32)*32;
  let buffer=buffers.get(g);
  if(!buffer) {
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d')!;
    buffer={canvas,context,image:context.createImageData(width,height),depth:new Float32Array(width*height)};buffers.set(g,buffer);
  }
  if(buffer.canvas.width!==width||buffer.canvas.height!==height) {
    buffer.canvas.width=width;buffer.canvas.height=height;
    buffer.image=buffer.context.createImageData(width,height);buffer.depth=new Float32Array(width*height);
  }
  rasterResident(faces.map(f=>({...f,points:f.points.map(p=>[(p[0]-left)*scale,(p[1]-top)*scale,p[2]])})),width,height,buffer.image.data,buffer.depth);
  buffer.context.putImageData(buffer.image,0,0);
  g.drawImage(buffer.canvas,left,top,width/scale,height/scale);
}
