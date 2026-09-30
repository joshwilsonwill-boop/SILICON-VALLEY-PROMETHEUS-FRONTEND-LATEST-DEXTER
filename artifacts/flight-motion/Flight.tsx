import React from 'react';
import {AbsoluteFill, Composition, Easing, Img, interpolate, registerRoot, staticFile, useCurrentFrame} from 'remotion';

const FPS = 60;
const ease = Easing.bezier(.16, 1, .3, 1);
const smooth = Easing.bezier(.65, 0, .35, 1);
const accelerate = Easing.bezier(.7, 0, .9, .35);
const p = (t:number, a:number, b:number, easing=ease) => interpolate(t,[a,b],[0,1],{easing,extrapolateLeft:'clamp',extrapolateRight:'clamp'});
const range = (t:number, a:number,b:number, c:number,d:number, easing=ease) => c+(d-c)*p(t,a,b,easing);
const styles = `
@font-face{font-family:Flight;src:url('${staticFile('sans.ttf')}');font-weight:400}
@font-face{font-family:Flight;src:url('${staticFile('light.ttf')}');font-weight:300}
@font-face{font-family:Flight;src:url('${staticFile('semibold.ttf')}');font-weight:600}
*{box-sizing:border-box} body{margin:0} .label{font-size:16px;letter-spacing:4px;text-transform:uppercase;font-weight:400}
`;

const Airplane:React.FC<{size?:number;style?:React.CSSProperties}> = ({size=390,style}) => <Img src={staticFile('aircraft.png')} style={{width:size,height:size,objectFit:'contain',...style}}/>;

const Tile:React.FC<{t:number;final?:boolean}> = ({t,final=false}) => {
  const arrive = p(t,final?8.05:.45,final?9.3:2.2);
  const depart = final?0:p(t,4.35,5.18,accelerate);
  const aircraftArrive = p(t,final?8.12:1.15,final?9.1:2.45);
  const tiltX = final?range(t,8.1,9.8,22,4):range(t,.45,2.7,56,11)-p(t,3.3,4.4)*5;
  const tiltY = final?range(t,8.1,9.8,-23,-9):range(t,.45,2.7,-32,-12)+p(t,3.3,4.4)*6;
  const rotate = final?range(t,8.1,9.7,-13,-5):range(t,.45,2.7,-19,-7)+p(t,3.3,4.4)*4;
  const float = Math.sin(t*1.8)*4;
  const tileSize = final?480:590;
  const planeSize = tileSize*.67;
  const left = (tileSize-planeSize)/2;
  const planeShiftX = (1-aircraftArrive)*-180 + depart*1180;
  const planeShiftY = (1-aircraftArrive)*160 - depart*1090;
  const sweep = p(t,final?9.15:2.25,final?10.35:3.5,smooth);
  const scale = final?range(t,8.1,9.4,.8,1):range(t,.45,2.4,.8,1)+p(t,3.0,4.4)*.05-depart*.19;
  return <div style={{position:'absolute',width:tileSize,height:tileSize,left:'50%',top:'50%',marginLeft:-tileSize/2,marginTop:-tileSize/2,perspective:1600,opacity:arrive*(1-(final?0:p(t,4.92,5.4))),transform:`translateY(${(1-arrive)*170+float}px) scale(${scale})`}}>
    <div style={{position:'absolute',inset:0,transformStyle:'preserve-3d',transform:`rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${rotate}deg)`}}>
      {[12,9,6,3].map(z=><div key={z} style={{position:'absolute',inset:0,borderRadius:'23%',background:'#101112',border:'1px solid #333536',transform:`translateZ(${-z}px) translateY(${z*.65}px)`}}/>)}
      <div style={{position:'absolute',inset:0,borderRadius:'23%',background:'linear-gradient(145deg,#303236 0%,#202124 45%,#0d0e10 100%)',boxShadow:final?'24px 46px 70px #10131624, 0 8px 16px #0e121520, inset 0 1px 2px #ffffff30':'0 40px 90px #00000090, inset 0 1px 2px #ffffff35',border:'1px solid #ffffff18',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 20% 5%, #fff 0%,transparent 60%)',opacity:.065}}/>
        <Airplane size={planeSize} style={{position:'absolute',left:left-25,top:left+45,opacity:.25*aircraftArrive*(1-depart),filter:'brightness(0) blur(14px)',transform:'translate(-15px,25px)'}}/>
        {[0,1,2].map(n=><div key={n} style={{position:'absolute',width:225,height:14,background:'linear-gradient(90deg,transparent,#b0c3e332,transparent)',left:80+n*45,top:290+n*35,filter:'blur(7px)',opacity:aircraftArrive*(1-depart),transform:'rotate(-45deg)'}}/>)}
        <div style={{position:'absolute',left:-tileSize+2.7*tileSize*sweep,top:-tileSize/2,width:tileSize*.30,height:tileSize*2,transform:'rotate(-28deg)',background:'linear-gradient(90deg,transparent,#ffffff13,transparent)',opacity:(sweep>0&&sweep<1)?1:0}}/>
      </div>
      <Airplane size={planeSize} style={{position:'absolute',left,top:left,opacity:aircraftArrive,transform:`translate3d(${planeShiftX}px,${planeShiftY}px,${42+Math.sin(t*2)*5+depart*140}px) rotate(${depart*11}deg) scale(${1+depart*.38})`,filter:`drop-shadow(-8px 16px 12px #00000045) blur(${depart*2}px)`}}/>
    </div>
  </div>
};

const RevealText:React.FC<{text:string;t:number;start:number;size:number;weight?:number;color?:string;style?:React.CSSProperties}> = ({text,t,start,size,weight=300,color='#f4f4f2',style}) => <div style={{display:'flex',fontSize:size,fontWeight:weight,letterSpacing:-size*.045,lineHeight:1.08,color,...style}}>{text.split(' ').map((word,i)=>{
 const progress=p(t,start+i*.08,start+.9+i*.08);
 return <span key={i} style={{display:'inline-block',overflow:'hidden',paddingBottom:size*.10,marginRight:size*.23}}><span style={{display:'inline-block',transform:`translateY(${(1-progress)*115}%)`,opacity:progress,filter:`blur(${(1-progress)*8}px)`}}>{word}</span></span>
})}</div>;

const Flight:React.FC = () => {
  const f=useCurrentFrame();
  const t=f/FPS;
  const open=p(t,0,.7,smooth);
  const firstFade=1-p(t,4.65,5.35);
  const secondOpacity=p(t,4.96,5.3)*(1-p(t,7.8,8.25));
  const iris=p(t,7.75,8.65,smooth);
  const routeProgress=p(t,5.0,7.6,smooth);
  const aircraftProgress=p(t,5.05,7.75,smooth);
  const airplaneX=range(aircraftProgress,0,1,420,1890,Easing.linear);
  const airplaneY=540-220*Math.sin(aircraftProgress*Math.PI)+aircraftProgress*80;
  const gridFade=p(t,.25,2)*(1-p(t,4.1,5.3));
  const finalText=p(t,8.65,9.7);
  return <AbsoluteFill style={{background:'#101113',color:'#f4f4f2',fontFamily:'Flight, sans-serif',overflow:'hidden'}}>
    <style>{styles}</style>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at 51% 41%, #303337 0%,#1b1d20 30%,#101113 68%)',opacity:open}}/>
    <AbsoluteFill style={{opacity:.085*gridFade,backgroundImage:'linear-gradient(#ffffff26 1px,transparent 1px),linear-gradient(90deg,#ffffff26 1px,transparent 1px)',backgroundSize:'96px 96px',maskImage:'radial-gradient(ellipse at center,#000,transparent 68%)'}}/>
    <div style={{position:'absolute',left:80,right:80,top:63,display:'flex',justifyContent:'space-between',opacity:p(t,.3,1.3)*firstFade}}>
      <span className="label" style={{color:'#c3c4c6'}}>FLIGHT / 001</span><span className="label" style={{color:'#6f737a'}}>A NEW PERSPECTIVE</span>
    </div>
    <svg width="1920" height="1080" style={{position:'absolute',opacity:.26*firstFade}}>
      <ellipse cx="960" cy="556" rx="502" ry="228" fill="none" stroke="#b4b7ba" strokeWidth="1" strokeDasharray="2300" strokeDashoffset={2300*(1-p(t,.25,2.15,smooth))} transform={`rotate(${-22+t*1.7} 960 556)`}/>
      <ellipse cx="960" cy="556" rx="502" ry="228" fill="none" stroke="#b4b7ba" strokeWidth=".45" opacity=".3" transform="rotate(25 960 556)"/>
    </svg>
    <div style={{position:'absolute',inset:0,transform:`translateY(${range(t,2.9,4.2,0,-25)}px)`}}><Tile t={t}/></div>
    <div style={{position:'absolute',top:900,width:'100%',textAlign:'center',opacity:p(t,2.15,3.1)*(1-p(t,4.1,4.6)),transform:`translateY(${range(t,2.15,3.1,20,0)}px)`}}>
      <div style={{fontSize:32,fontWeight:300,letterSpacing:'-.7px'}}>Ready for takeoff.</div>
      <div className="label" style={{fontSize:11,color:'#81858c',marginTop:20,letterSpacing:4}}>BUILT TO GO FURTHER</div>
    </div>
    <AbsoluteFill style={{opacity:secondOpacity,background:'radial-gradient(ellipse at 78% 42%,#292d33,#101113 65%)'}}>
      <svg width="1920" height="1080" style={{position:'absolute'}}>
        <defs><linearGradient id="route"><stop stopColor="#fff" stopOpacity="0"/><stop offset=".6" stopColor="#d4d9df" stopOpacity=".65"/><stop offset="1" stopColor="#fff" stopOpacity=".05"/></linearGradient></defs>
        <path d="M -120 1010 C 400 1060 550 200 1150 310 S 1790 950 2100 150" fill="none" stroke="#ffffff12" strokeWidth="1"/>
        <path d="M -120 1010 C 400 1060 550 200 1150 310 S 1790 950 2100 150" fill="none" stroke="url(#route)" strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset={1-routeProgress}/>
        {[0,1,2,3].map(n=><g key={n} opacity=".18"><line x1={1380+n*100} y1="650" x2={1380+n*100} y2="850" stroke="#a9b0ba"/><line x1="1280" y1={650+n*50} x2="1810" y2={650+n*50} stroke="#a9b0ba"/></g>)}
      </svg>
      <div style={{position:'absolute',left:145,top:170,opacity:p(t,5.17,5.9)}} className="label">LESS FRICTION. MORE FREEDOM.</div>
      <div style={{position:'absolute',left:137,top:305,transform:`translateY(${range(t,7.25,8,-0,-28)}px)`}}><RevealText text="Go" t={t} start={5.2} size={174}/><RevealText text="beyond." t={t} start={5.35} size={174}/></div>
      <div style={{position:'absolute',left:147,top:772,display:'flex',alignItems:'center',gap:19,opacity:p(t,5.8,6.5)}}><div style={{height:1,width:range(t,5.8,6.9,0,72),background:'#dadcde'}}/><span style={{fontSize:22,fontWeight:300,color:'#a5a9ae'}}>A little lift. A whole new altitude.</span></div>
      {[4,3,2,1].map(n=><Airplane key={n} size={400} style={{position:'absolute',left:airplaneX-200-n*24,top:airplaneY-200+n*20,transform:`rotate(${range(aircraftProgress,0,1,-8,32,Easing.linear)}deg) scale(${range(aircraftProgress,0,1,.7,1.15,Easing.linear)})`,opacity:.035*(5-n),filter:`blur(${n*4}px)`}}/>)}
      <Airplane size={400} style={{position:'absolute',left:airplaneX-200,top:airplaneY-200,transform:`rotate(${range(aircraftProgress,0,1,-8,32,Easing.linear)}deg) scale(${range(aircraftProgress,0,1,.7,1.15,Easing.linear)})`,filter:'drop-shadow(-25px 42px 24px #00000080)'}}/>
      <div className="label" style={{position:'absolute',bottom:80,right:105,color:'#838b95',fontSize:12,opacity:p(t,6.0,6.8)}}>ALTITUDE <span style={{color:'#e1e4e8',marginLeft:20,fontVariantNumeric:'tabular-nums'}}>{Math.round(range(t,5.35,7.4,0,38000,smooth)).toLocaleString('en-US')} FT</span></div>
    </AbsoluteFill>
    {iris>0&&<AbsoluteFill style={{background:'#f4f4f0',clipPath:`circle(${iris*2300}px at 1320px 520px)`}}/>}
    {t>=7.75&&<AbsoluteFill style={{opacity:p(t,8.02,8.45)}}>
      <AbsoluteFill style={{background:'radial-gradient(ellipse at 28% 51%,#fff9,transparent 65%)'}}/>
      <div style={{position:'absolute',left:85,top:65,color:'#33373b',opacity:p(t,8.4,9.1)}} className="label">FLIGHT / 001</div>
      <div style={{position:'absolute',left:120,top:160,width:800,height:760,transform:`translateX(${range(t,8.0,9.1,-60,0)}px)`}}><Tile t={t} final/></div>
      <div style={{position:'absolute',left:990,top:330}}>
        <div className="label" style={{fontSize:13,color:'#81858a',marginBottom:33,opacity:finalText,transform:`translateY(${(1-finalText)*12}px)`}}>YOUR NEXT CHAPTER</div>
        <RevealText text="Above" t={t} start={8.55} size={110} color="#191b1e"/>
        <RevealText text="the ordinary." t={t} start={8.68} size={110} color="#191b1e"/>
        <div style={{marginTop:27,height:1,width:range(t,9.3,10.2,0,610),background:'#191b1e26'}}/>
        <div style={{display:'flex',alignItems:'center',gap:15,marginTop:29,opacity:p(t,9.5,10.2),transform:`translateY(${range(t,9.5,10.2,10,0)}px)`}}>
          <span style={{fontSize:21,color:'#686c72',fontWeight:300}}>Go further. Feel lighter.</span>
          <svg width="24" height="24" viewBox="0 0 24 24" style={{marginLeft:110}}><path d="M5 19L19 5M5 5h14v14" fill="none" stroke="#34373b" strokeWidth="1.2"/></svg>
        </div>
      </div>
      <div style={{position:'absolute',left:86,right:86,bottom:68,display:'flex',justifyContent:'space-between',opacity:p(t,9.5,10.3),color:'#8a8d91'}} className="label"><span style={{fontSize:11}}>DESIGNED FOR WHAT'S NEXT.</span><span style={{fontSize:11}}>A NEW PERSPECTIVE ↗</span></div>
    </AbsoluteFill>}
    <AbsoluteFill style={{background:'#101113',opacity:1-open,pointerEvents:'none'}}/>
  </AbsoluteFill>;
};

registerRoot(()=><Composition id="Flight" component={Flight} durationInFrames={720} fps={60} width={1920} height={1080}/>);
