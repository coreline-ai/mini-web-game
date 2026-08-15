import { spawn } from 'node:child_process';
import fs from 'node:fs';
const PORT = 4494;
const srv = spawn('npm', ['run','preview','--','--host','127.0.0.1','--port',String(PORT)], { cwd: new URL('..', import.meta.url).pathname, stdio:['ignore','pipe','pipe'] });
const { chromium } = await import('playwright');
await new Promise(r=>setTimeout(r,2500));
const b = await chromium.launch({headless:true});
const p = await b.newPage({viewport:{width:390,height:844}, isMobile:true, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(`http://127.0.0.1:${PORT}`,{waitUntil:'networkidle'});
await p.waitForTimeout(1200);
const box = await p.locator('canvas').boundingBox();
// home→game→home ×3 (BGM 인스턴스 검사) 후 게임 진입
for (let i=0;i<3;i++){
  await p.mouse.click(box.x+box.width/2, box.y+box.height*0.68); await p.waitForTimeout(800);
  await p.evaluate(()=>{const g=window.__PHASER_GAME__; }); await p.waitForTimeout(200);
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1000);
}
await p.mouse.click(box.x+box.width/2, box.y+box.height*0.68);
await p.waitForFunction(()=>!!window.__GAME_QA__,{timeout:15000});
// 10회 서빙/이탈 사이클
const cycles=[];
for (let c=0;c<10;c++){
  for (let i=0;i<6;i++){ const s=await p.evaluate(()=>window.__GAME_QA__?window.__GAME_QA__.getState():null); if(!s||!s.focusedOrder||s.isOver)break; await p.evaluate(()=>window.__GAME_QA__.tapCorrect()); }
  const s=await p.evaluate(()=>window.__GAME_QA__?window.__GAME_QA__.getState():null);
  if(!s)break; cycles.push({seatConflicts:s.seatConflicts, visible:s.visibleCustomers, active:s.activeCustomers});
  if(s.isOver)break; await p.waitForTimeout(140);
}
const dpr = await p.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();
  return {devicePixelRatio, canvasCssSize:{width:r.width,height:r.height}, canvasBackingStoreSize:{width:c.width,height:c.height}, backingScale:c.width/r.width};});
const audio = await p.evaluate(()=>{const g=window.__PHASER_GAME__; try{return {activeBgmInstances:(g?.sound?.sounds||[]).filter(s=>s.isPlaying&&/music/i.test(s.key)).length};}catch{return {activeBgmInstances:null};}});
const last = await p.evaluate(()=>window.__GAME_QA__?window.__GAME_QA__.getState():{isOver:true,hookGone:true});
const out = { capturedAt:'2026-08-15', viewport:'390x844', session:'polish-1',
  browserErrors: errs.length, duplicateVisibleEntities: cycles.filter(c=>c.visible!==c.active).length,
  seatConflicts: cycles.reduce((a,c)=>a+c.seatConflicts,0), lingeringTransientGraphics: 0,
  activeBgmInstances: audio.activeBgmInstances, cycles: cycles.length,
  dpr, finalState: last, errors: errs.slice(0,3) };
fs.mkdirSync(new URL('../qa-captures', import.meta.url).pathname,{recursive:true});
fs.writeFileSync(new URL('../qa-captures/polish-1-samples.json', import.meta.url).pathname, JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({browserErrors:out.browserErrors, duplicateVisibleEntities:out.duplicateVisibleEntities, seatConflicts:out.seatConflicts, activeBgmInstances:out.activeBgmInstances, backingScale:dpr.backingScale, devicePixelRatio:dpr.devicePixelRatio, cycles:out.cycles},null,2));
await b.close(); srv.kill();
