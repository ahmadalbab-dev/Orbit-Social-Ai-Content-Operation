"use client";
import { useEffect, useRef } from "react";
import { AI_STUDIO_SCALE, codeCellBlend, codeCellStagger, heroSequence } from "./hero-sequence";

const codeLines = [
  "const orbit = { create, edit, review, schedule }; ",
  'draft.channels = ["facebook", "instagram", "threads"]; ',
  "media.edit({ image: true, video: true }); ",
  "await review.approve(draft.revision); ",
  'calendar.plan({ timezone: "Asia/Kuala_Lumpur" }); ',
  "ideas → content → media → approval → calendar ",
];
type Cell = { column: number; row: number; orbit: number; studio: number; leftOrbit: number; leftStudio: number; stagger: number; colour: number };

export function OrbitField({ paused, centered = false }: { paused: boolean; centered?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const orbitMask = document.createElement("canvas"), studioMask = document.createElement("canvas");
    const orbit = orbitMask.getContext("2d", { willReadFrequently: true });
    const studio = studioMask.getContext("2d", { willReadFrequently: true });
    if (!orbit || !studio) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, width = 0, height = 0, elapsed = 0, lastTick = 0, disposed = false, onScreen = true;
    let cells: Cell[] = [], rows: { line: string; text: string; period: number; y: number; flow: number }[] = [], colours: string[] = [];
    let step=5, rowStep=9;
    let dark = document.documentElement.dataset.theme !== "light", glyphSize = 9;
    const frozen = () => paused || reduced.matches;
    const active = () => !disposed && !document.hidden && onScreen && !frozen();

    function palette() {
      dark = document.documentElement.dataset.theme !== "light";
      const stops = dark ? [[148,240,228],[199,175,255],[255,181,223]] : [[17,87,92],[65,33,139],[126,26,86]];
      colours = Array.from({length:24},(_,index)=>{
        const point=index/23*2, segment=Math.min(1,Math.floor(point)), fraction=point-segment;
        const values=stops[segment].map((value,channel)=>Math.round(value+(stops[segment+1][channel]-value)*fraction));
        return `rgb(${values.join(",")})`;
      });
      // Cache a continuous silhouette beneath the code texture. Tinting preserves the
      // masks' alpha coverage, and runs only after resize or an appearance change.
      for (const drawing of [orbit!,studio!]) {
        drawing.save();
        drawing.globalCompositeOperation="source-in";
        const gradient=drawing.createLinearGradient(width*.15,0,width*.95,height*.35);
        gradient.addColorStop(0,colours[0]);gradient.addColorStop(.5,colours[12]);gradient.addColorStop(1,colours[23]);
        drawing.fillStyle=gradient;drawing.fillRect(0,0,width,height);
        drawing.restore();
      }
    }
    function draw(now: number) {
      frame = 0;
      if (disposed || !width || !height) return;
      if (active()) {
        // Resume from the same phase after suspension. A delayed frame does not skip the dissolve.
        if (lastTick) elapsed += Math.min(64, Math.max(0, now-lastTick));
        lastTick=now;
      } else lastTick=0;
      const time=frozen()?0:elapsed, weights=heroSequence(time,frozen());
      element!.dataset.scene=weights.studio>.5?"ai-studio":"orbit";
      element!.dataset.motion=frozen()?"paused":active()?"running":"suspended";
      context!.clearRect(0,0,width,height);
      context!.font=`600 ${glyphSize}px JetBrains Mono, monospace`;
      context!.textBaseline="middle";
      context!.globalAlpha=1;
      context!.fillStyle=dark?"rgba(180,156,255,.065)":"rgba(62,43,104,.045)";
      for (const row of rows) {
        // One continuous code grid supplies both the ambient and title glyphs.
        const offset=(time*row.flow)%row.period;
        context!.fillText(row.text,-offset,row.y);
      }
      // A quiet cached under-light preserves small-screen letter contours without
      // making an opaque word disconnected from the foreground code grid.
      const silhouette=dark ? .12 : .16;
      if(weights.orbit>0){context!.globalAlpha=silhouette*weights.orbit*weights.orbit;context!.drawImage(orbitMask,0,0,width,height);}
      if(weights.studio>0){context!.globalAlpha=silhouette*weights.studio*weights.studio;context!.drawImage(studioMask,0,0,width,height);}
      const transitioning=weights.studio>0 && weights.studio<1;
      for (const cell of cells) {
        const row=rows[cell.row], flow=time*row.flow/step, fraction=flow-Math.floor(flow);
        const blend=transitioning?codeCellBlend(weights.studio,cell.stagger):weights.studio;
        const current=cell.orbit+(cell.studio-cell.orbit)*blend;
        const previous=cell.leftOrbit+(cell.leftStudio-cell.leftOrbit)*blend;
        const opacity=current+(previous-current)*fraction;
        if(opacity<.012)continue;
        context!.globalAlpha=opacity;
        context!.fillStyle=colours[cell.colour];
        const glyph=row.line[(cell.column+Math.floor(flow))%row.line.length];
        context!.fillText(glyph,cell.column*step-fraction*step,row.y);
      }
      context!.globalAlpha=1;
      if (active()) frame=requestAnimationFrame(draw);
    }
    function refresh() {
      cancelAnimationFrame(frame);frame=0;lastTick=0;
      palette();
      draw(performance.now());
    }
    function resize() {
      if (disposed) return;
      const rect=element!.getBoundingClientRect();
      width=rect.width;height=rect.height;
      cancelAnimationFrame(frame);frame=0;lastTick=0;
      if (!width || !height) return;
      // Bound bitmap memory on very large screens, and sample title coverage only on resize.
      const ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(6_000_000/(width*height)));
      element!.width=Math.max(1,Math.round(width*ratio));element!.height=Math.max(1,Math.round(height*ratio));
      context!.setTransform(ratio,0,0,ratio,0,0);
      const maskRatio=Math.min(1,Math.sqrt(2_000_000/(width*height)));
      for(const mask of [orbitMask,studioMask]) { mask.width=Math.max(1,Math.round(width*maskRatio));mask.height=Math.max(1,Math.round(height*maskRatio)); }
      for(const drawing of [orbit!,studio!])drawing.setTransform(maskRatio,0,0,maskRatio,0,0);
      const size=Math.min(width*.19,centered?210:300),logo=size*.7,gap=size*.14;
      orbit!.font=`800 ${size}px JetBrains Mono, monospace`;
      const total=logo+gap+orbit!.measureText("Orbit").width;
      const left=centered||width<700?(width-total)/2:width-total-width*.055;
      const cy=centered?height*.4:width<700?130:height*.34;
      orbit!.fillStyle="#fff";orbit!.textBaseline="middle";
      orbit!.fillText("Orbit",left+logo+gap,cy);
      orbit!.save();orbit!.translate(left+logo/2,cy);orbit!.strokeStyle="#fff";orbit!.lineWidth=logo*.065;
      orbit!.beginPath();orbit!.arc(0,0,logo*.3,0,Math.PI*2);orbit!.stroke();
      orbit!.rotate(-.6);orbit!.beginPath();orbit!.ellipse(0,0,logo*.46,logo*.19,0,0,Math.PI*2);orbit!.stroke();
      orbit!.rotate(.6);orbit!.beginPath();orbit!.arc(0,0,logo*.085,0,Math.PI*2);orbit!.fill();
      orbit!.beginPath();orbit!.arc(logo*.35,-logo*.25,logo*.085,0,Math.PI*2);orbit!.fill();orbit!.restore();
      studio!.font=`800 ${size*AI_STUDIO_SCALE}px JetBrains Mono, monospace`;
      studio!.fillStyle="#fff";studio!.textAlign="center";studio!.textBaseline="middle";
      studio!.fillText("ai studio",left+total/2,cy);
      const orbitPixels=orbit!.getImageData(0,0,orbitMask.width,orbitMask.height).data;
      const studioPixels=studio!.getImageData(0,0,studioMask.width,studioMask.height).data;
      // Match the background font, column pitch, baseline and flow exactly.
      // Size the grid to keep coverage caches bounded on 4K screens.
      glyphSize=Math.max(width<700?7.5:9,Math.sqrt(width*height/16000));
      context!.font=`600 ${glyphSize}px JetBrains Mono, monospace`;
      step=context!.measureText("M").width;rowStep=glyphSize*1.12;
      const columns=Math.ceil(width/step)+1,rowCount=Math.ceil(height/rowStep);
      const coverageA=new Float32Array(columns*rowCount),coverageB=new Float32Array(columns*rowCount);
      for(let row=0;row<rowCount;row++)for(let column=0;column<columns;column++){
        const x=(column+.5)*step,y=(row+.5)*rowStep;
        // Average nearby coverage once so narrow strokes remain readable between columns.
        let a=0,b=0;
        for(const dx of [-step*.22,0,step*.22]){
          const px=Math.max(0,Math.min(orbitMask.width-1,Math.floor((x+dx)*maskRatio))),py=Math.min(orbitMask.height-1,Math.floor(y*maskRatio));
          const pixel=(py*orbitMask.width+px)*4+3;
          a+=orbitPixels[pixel]/765;b+=studioPixels[pixel]/765;
        }
        coverageA[row*columns+column]=a;coverageB[row*columns+column]=b;
      }
      cells=[];
      for(let row=0;row<rowCount;row++)for(let column=0;column<columns;column++){
        const at=row*columns+column,left=row*columns+Math.max(0,column-1);
        if(!coverageA[at]&&!coverageB[at]&&!coverageA[left]&&!coverageB[left])continue;
        cells.push({column,row,orbit:coverageA[at],studio:coverageB[at],leftOrbit:coverageA[left],leftStudio:coverageB[left],stagger:codeCellStagger(column,row),colour:Math.min(23,Math.max(0,Math.floor((column/columns*.8+row/rowCount*.2)*23)))});
      }
      if(cells.length){
        const left=Math.min(...cells.map(cell=>cell.column*step)),top=Math.min(...cells.map(cell=>cell.row*rowStep));
        const right=Math.max(...cells.map(cell=>(cell.column+1)*step)),bottom=Math.max(...cells.map(cell=>(cell.row+1)*rowStep));
        element!.dataset.titleBounds=JSON.stringify({x:left,y:top,width:right-left,height:bottom-top});
      }
      rows=Array.from({length:rowCount},(_,index)=>{
        const line=codeLines[index%codeLines.length].replaceAll(" ","·"),period=line.length*step;
        return {line,text:line.repeat(Math.ceil(width/period)+2),period,y:(index+.5)*rowStep,flow:.012+(index%3)*.0015};
      });
      palette();draw(performance.now());
    }
    // System colour-scheme and cross-tab preference changes update the resolved HTML
    // theme without necessarily dispatching orbit-appearance. Repaint even while paused.
    const themeObserver=new MutationObserver(refresh);
    themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
    const observer=new ResizeObserver(resize);observer.observe(element);
    const intersection=new IntersectionObserver(entries=>{
      onScreen=entries[0]?.isIntersecting??false;
      cancelAnimationFrame(frame);frame=0;lastTick=0;
      if(onScreen)refresh();else element!.dataset.motion=frozen()?"paused":"suspended";
    },{threshold:0});intersection.observe(element);
    const visibility=()=>{
      cancelAnimationFrame(frame);frame=0;lastTick=0;
      if(!document.hidden && onScreen)refresh();else element!.dataset.motion=frozen()?"paused":"suspended";
    };
    window.addEventListener("orbit-appearance",refresh);
    reduced.addEventListener("change",refresh);
    document.addEventListener("visibilitychange",visibility);
    void document.fonts.ready.then(()=>{if(!disposed)resize();});resize();
    return()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();themeObserver.disconnect();
      window.removeEventListener("orbit-appearance",refresh);reduced.removeEventListener("change",refresh);document.removeEventListener("visibilitychange",visibility);
    };
  },[paused,centered]);
  return <div className={`orbit-artwork ${centered?"orbit-artwork-centered":""}`} data-paused={paused}><canvas className="orbit-field" ref={canvas} aria-hidden="true"/></div>;
}
