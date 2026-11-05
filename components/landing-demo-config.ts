import type {Item} from '@/domain/model';
export type DemoTime='morning'|'evening'|'night';
export type DemoWeather='clear'|'rain'|'snow';
export const demoItems:Item[]=[
 ['desk-oak',11,1,0,'#92758c'],['chair-sage',12,4,180,'#89947c'],['bed-cloud',1,7,0,'#b09bbb'],['plant-monstera',21,2,0,'#718e7c'],['shelf-books',1,1,90,'#827384'],['rug-sunset',10,5,0,'#938397'],['sofa-moss',17,10,0,'#89947c'],['record-warm',18,7,0,'#967786'],['lamp-honey',22,9,0,'#e6c99b'],['plant-fern',6,13,0,'#718e7c']
].map(([productId,x,y,rotation,color],i)=>({id:`demo-${i}`,productId:String(productId),x:Number(x),y:Number(y),rotation:Number(rotation),color:String(color),on:true}));
export const demoAppearance={wallLeft:'#53617d',wallRight:'#927583',floor:'#403d49'};
export const demoLights={garlandMode:'steady' as const,garland:true,desk:true,garlandInstalled:true,garlandColor:'#e6c99b',deskColor:'#c3b1d4',garlandBrightness:55,deskBrightness:45};
export const demoDaylight={morning:1,evening:.42,night:0};
export const demoAmbient={morning:'#859d99',evening:'#ac8597',night:'#8786b4'};
