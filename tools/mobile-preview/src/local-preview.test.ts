import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { localPreviewApi as api, PREVIEW_STORAGE_KEY } from '../../../apps/web/app/local-preview.ts';
const memory = new Map<string,string>();
const originalFetch = globalThis.fetch;
beforeEach(() => {
  memory.clear(); globalThis.fetch=originalFetch;
  Object.defineProperty(globalThis,'localStorage',{ configurable:true,value:{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);}}});
});
async function draft() {
  const brand=await api<{id:string}>('/brands','POST',{name:'Orbit',voice:'Santai',audience:'Creators'});
  return api<{id:string;revision:number;variants:unknown[];status:string}>('/content/generate','POST',{brandId:brand.id,topic:'Suasana KL\nAccount type: creator',platforms:['facebook','instagram','threads']});
}
describe('device-only phone preview', () => {
  it('persists drafts and returns isolated copies without network access', async()=>{
    let networkCalls=0;
    globalThis.fetch=async()=>{networkCalls++;throw Error('Network forbidden');};
    const item=await draft(); assert.equal(item.variants.length,3); item.status='FAKE';
    const stored=(await api<Array<{status:string;topic:string}>>('/content'))[0];
    assert.equal(stored.status,'DRAFT'); assert.equal(stored.topic,'Suasana KL');
    assert.ok(memory.has(PREVIEW_STORAGE_KEY)); assert.equal(networkCalls,0);
  });
  it('requires explicit current-revision approval and invalidates it on edit',async()=>{
    const item=await draft();
    await assert.rejects(api(`/content/${item.id}/publish`,'POST'),/approval/);
    await api(`/content/${item.id}/approve`,'POST',{expectedRevision:1});
    const edited=await api<{revision:number;status:string;approvedRevision?:number}>(`/content/${item.id}/review`,'PUT',{expectedRevision:1,variants:item.variants});
    assert.equal(edited.revision,2); assert.equal(edited.status,'DRAFT'); assert.equal(edited.approvedRevision,undefined);
    await assert.rejects(api(`/content/${item.id}/approve`,'POST',{expectedRevision:1}),/revision/);
    await assert.rejects(api(`/content/${item.id}/publish`,'POST'),/approval/);
  });
  it('validates due times and never labels simulated publication as live',async()=>{
    const item=await draft(); await api(`/content/${item.id}/approve`,'POST',{expectedRevision:1});
    await assert.rejects(api(`/content/${item.id}/schedule`,'POST',{expectedRevision:1,scheduledFor:'bad'}),/future/);
    await api(`/content/${item.id}/schedule`,'POST',{expectedRevision:1,scheduledFor:new Date(Date.now()+3600000).toISOString()});
    await assert.rejects(api(`/content/${item.id}/publish`,'POST'),/not due/);
    const other=await draft(); await api(`/content/${other.id}/approve`,'POST',{expectedRevision:1});
    assert.equal((await api<{status:string}>(`/content/${other.id}/publish`,'POST')).status,'SIMULATED');
  });
  it('reuses identical profiles and reports storage failures',async()=>{
    const body={name:'Orbit',voice:'Santai',audience:'Creators'};
    assert.deepEqual(await api('/brands','POST',body),await api('/brands','POST',body));
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{throw Error('quota');}}});
    await assert.rejects(api('/brands','POST',body),/not saved/);
  });
  it('rejects invalid variants and corrupt storage',async()=>{
    const item=await draft(); await assert.rejects(api(`/content/${item.id}/review`,'PUT',{expectedRevision:1,variants:[]}),/Valid/);
    memory.set(PREVIEW_STORAGE_KEY,'{broken'); await assert.rejects(api('/content'),/could not be read/);
  });
});


import { malaysiaDateKey, monthGrid } from '../../../apps/web/app/calendar-data.ts';
describe('Malaysia calendar',()=>{
  it('uses Malaysia date at a UTC day boundary',()=>{assert.equal(malaysiaDateKey(new Date('2026-10-14T17:00:00Z')),'2026-10-15');});
  it('includes leap day and begins each grid on Monday',()=>{const grid=monthGrid(2028,1);assert.equal(grid.length,42);assert.equal(grid.filter(d=>d.current).length,29);assert.ok(grid.some(d=>d.key==='2028-02-29'&&d.current));assert.equal(new Date(grid[0].key).getUTCDay(),1);});
});
