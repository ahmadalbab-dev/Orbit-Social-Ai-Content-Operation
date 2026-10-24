import {expect, it} from 'vitest';
import {freshComposition} from './image-composition';
import {beforeAfterRecipe} from './image-recipes';

const image = {} as HTMLImageElement;
const layer = {id:'after',name:'after.png',image:{} as HTMLImageElement,x:50,y:50,width:40,opacity:70};
it('requires both uploaded image slots and meaningful bounded labels',()=>{
 expect(()=>beforeAfterRecipe(freshComposition(),'after','Before','After')).toThrow('base image');
 expect(()=>beforeAfterRecipe(freshComposition(image),'missing','Before','After')).toThrow('after photo');
 const state={...freshComposition(image),overlays:[layer]};
 expect(()=>beforeAfterRecipe(state,'after','','After')).toThrow('labels');
 expect(()=>beforeAfterRecipe(state,'after','x'.repeat(61),'After')).toThrow('labels');
});
it('places actual images side by side while retaining assets and leaving the input unchanged',()=>{
 const extra={...layer,id:'logo',name:'logo.png',opacity:80};
 const state={...freshComposition(image),caption:'Previous copy',overlays:[layer,extra]};
 const result=beforeAfterRecipe(state,'after',' Sebelum ',' Selepas ');
 expect(result).toMatchObject({image,ratio:'1:1',baseScale:.46,baseX:25,baseY:46,caption:'Sebelum → Selepas'});
 expect(result.overlays[0]).toMatchObject({id:'after',image:layer.image,x:75,y:46,width:46,opacity:100});
 expect(result.overlays[1]).toMatchObject({id:'logo',image:extra.image,opacity:0});
 expect(state.caption).toBe('Previous copy');expect(state.overlays[0]).toBe(layer);expect(extra.opacity).toBe(80);
 expect(result.overlays).toHaveLength(state.overlays.length);
});
