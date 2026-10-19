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
type Cell = { x: number; y: number; orbit: number; studio: number; stagger: number; index: number; glyph: string; colour: number };

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
    let cells: Cell[] = [], rows: { text: string; period: number; y: number }[] = [], colours: string[] = [];
    let dark = document.documentElement.dataset.theme !== "light", glyphSize = 9;
    const frozen = () => paused || reduced.matches;
    const active = () => !disposed && !document.hidden && onScreen && !frozen();

    function palette() {
      dark = document.documentElement.dataset.theme !== "light";
      const stops = dark ? [[148,240,228],[199,175,255],[255,181,223]] : [[35,126,133],[104,73,188],[169,57,123]];
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
      context!.font="12px JetBrains Mono, monospace";
      context!.textBaseline="alphabetic";
      context!.globalAlpha=1;
      context!.fillStyle=dark?"rgba(180,156,255,.12)":"rgba(82,55,142,.11)";
      for (let index=0;index<rows.length;index++) {
        const row=rows[index];
        // Fractional translation keeps the code flowing, with a seamless repeated-line wrap.
        const offset=(time*(.012+(index%3)*.0015))%row.period;
        context!.fillText(row.text,-offset,row.y);
      }
      // The readable word comes from the cached full mask, not isolated tiny glyphs.
      // Squared weights keep the dominant title clear without two opaque word ghosts.
      const silhouette=dark ? .5 : .78;
      if(weights.orbit>0){context!.globalAlpha=silhouette*weights.orbit*weights.orbit;context!.drawImage(orbitMask,0,0,width,height);}
      if(weights.studio>0){context!.globalAlpha=silhouette*weights.studio*weights.studio;context!.drawImage(studioMask,0,0,width,height);}
      context!.font=`600 ${glyphSize}px JetBrains Mono, monospace`;
      context!.textBaseline="middle";
      const transitioning=weights.studio>0 && weights.studio<1;
      for (const cell of cells) {
        const blend=transitioning?codeCellBlend(weights.studio,cell.stagger):weights.studio;
        const opacity=cell.orbit+(cell.studio-cell.orbit)*blend;
        if (opacity<.012) continue;
        context!.globalAlpha=opacity;
        context!.fillStyle=colours[cell.colour];
        // Same lattice for both titles: no overlapping full-title layers or per-cell erasing.
        const scramble=Math.floor(time/110+cell.index*.618);
        const glyph=transitioning && blend>.03 && blend<.97 && cell.orbit!==cell.studio
          ? codeLines[(cell.index+scramble)%codeLines.length][(cell.index+scramble)%codeLines[(cell.index+scramble)%codeLines.length].length]
          : cell.glyph;
        context!.fillText(glyph===" "?"·":glyph,cell.x,cell.y);
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
      const step=Math.max(5.5,Math.sqrt(width*height/14000)),rowStep=step*1.3;
      glyphSize=Math.max(7,step*1.42);cells=[];
      for(let row=0,y=rowStep/2;y<height;y+=rowStep,row++)for(let column=0,x=step/2;x<width;x+=step,column++){
        const px=Math.min(orbitMask.width-1,Math.floor(x*maskRatio)),py=Math.min(orbitMask.height-1,Math.floor(y*maskRatio));
        const pixel=(py*orbitMask.width+px)*4+3,a=orbitPixels[pixel]/255,b=studioPixels[pixel]/255;
        if(!a&&!b)continue;
        const line=codeLines[row%codeLines.length],glyph=line[column%line.length];
        cells.push({x:x-step*.35,y,orbit:a,studio:b,stagger:codeCellStagger(column,row),index:column+row*127,glyph:glyph===" "?"·":glyph,colour:Math.min(23,Math.max(0,Math.floor((x/width*.8+y/height*.2)*23)))});
      }
      if (cells.length) {
        const left=Math.min(...cells.map(cell=>cell.x)),top=Math.min(...cells.map(cell=>cell.y));
        const right=Math.max(...cells.map(cell=>cell.x))+step,bottom=Math.max(...cells.map(cell=>cell.y))+rowStep/2;
        // Local CSS-pixel bounds let layout checks distinguish the title from ambient background code.
        element!.dataset.titleBounds=JSON.stringify({x:left,y:top-rowStep/2,width:right-left,height:bottom-top+rowStep/2});
      }
      context!.font="12px JetBrains Mono, monospace";
      rows=Array.from({length:Math.ceil(height/20)},(_,index)=>{
        const line=codeLines[index%codeLines.length],period=context!.measureText(line).width;
        return {text:line.repeat(Math.ceil(width/Math.max(1,period))+2),period:Math.max(1,period),y:index*20+14};
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
