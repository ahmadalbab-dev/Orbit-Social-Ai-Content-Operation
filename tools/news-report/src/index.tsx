import React from 'react';
import {registerRoot, Composition, AbsoluteFill, staticFile, useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';

type Props = {title:string; date:string; videoFile:string; panelOpacity:number; titleFontSize:number; width:number; height:number; fps:number; durationInFrames:number};
export const NewsReport=({title,date,videoFile,panelOpacity,titleFontSize}:Props)=>{
  const {fps,width,height}=useVideoConfig();
  const s=width/512;
  return <AbsoluteFill style={{fontFamily:'Arial, sans-serif',color:'white',background:'#111'}}>
    <Video src={staticFile(videoFile)} premountFor={fps} objectFit="contain" style={{width:'100%',height:'100%'}}/>
    <div style={{position:'absolute',left:0,right:25*s,bottom:height*(168/910),background:`rgba(185,12,24,${panelOpacity})`,padding:`${22*s}px ${26*s}px ${22*s}px ${38*s}px`}}>
      <div style={{position:'absolute',left:22*s,top:-39*s,background:'rgba(155,12,24,0.65)',padding:`${7*s}px ${13*s}px`,borderRadius:18*s,fontSize:16*s,fontWeight:700,letterSpacing:0.6*s}}>{date}</div>
      <div style={{position:'absolute',left:22*s,top:23*s,bottom:39*s,width:4*s,borderRadius:4*s,background:'white'}}/>
      <div style={{fontSize:titleFontSize*s,fontWeight:700,lineHeight:1.22,letterSpacing:-0.3*s,textShadow:`0 ${s}px ${4*s}px rgba(0,0,0,0.55)`,whiteSpace:'pre-line',overflowWrap:'anywhere'}}>{title}</div>
      <div style={{height:s,background:'rgba(255,255,255,0.85)',marginTop:16*s,width:'92%'}}/>
    </div>
  </AbsoluteFill>;
};
registerRoot(()=> <Composition id="NewsReport" component={NewsReport} width={512} height={910} fps={30} durationInFrames={460}
  defaultProps={{title:'Pemandangan terkini\ndi sekitar Kuala Lumpur',date:'14 OKTOBER 2026',videoFile:'scene.mp4',width:512,height:910,fps:30,durationInFrames:460,panelOpacity:0.35,titleFontSize:27}}
  calculateMetadata={({props})=>{
    if (![props.width,props.height,props.durationInFrames].every(value=>Number.isInteger(value)&&value>0) || props.width%2 || props.height%2 || !Number.isFinite(props.fps) || props.fps<1 || props.fps>120) throw new Error('Valid even dimensions, frame rate and duration required');
    if (!Number.isFinite(props.panelOpacity) || props.panelOpacity<0 || props.panelOpacity>1 || !Number.isFinite(props.titleFontSize) || props.titleFontSize<18 || props.titleFontSize>40 || !props.title.trim()) throw new Error('Valid title style required');
    return {width:props.width,height:props.height,fps:props.fps,durationInFrames:props.durationInFrames};
  }}
/>);
