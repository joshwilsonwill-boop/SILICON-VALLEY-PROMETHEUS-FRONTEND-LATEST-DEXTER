import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderStill, renderMedia, openBrowser} from '@remotion/renderer';

const root=path.dirname(fileURLToPath(import.meta.url));
const mode=process.argv[2]||'stills';
console.log('Bundling Flight motion composition…');
const serveUrl=await bundle({entryPoint:path.join(root,'Flight.tsx'),publicDir:path.join(root,'public'),outDir:path.join(root,'bundle'),onProgress:()=>{}});
const browserExecutable='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser=await openBrowser('chrome',{browserExecutable,chromiumOptions:{gl:'angle',enableMultiProcessOnLinux:true}});
try{
  const composition=await selectComposition({serveUrl,id:'Flight',puppeteerInstance:browser,browserExecutable});
  if(mode==='stills'){
    for(const [name,frame] of [['01-reveal',180],['02-flight',378],['03-finale',636]]){
      await renderStill({serveUrl,composition,frame,output:path.join(root,`${name}.png`),puppeteerInstance:browser,browserExecutable,imageFormat:'png'});
      console.log(`Preview ${name} ready.`);
    }
  }else{
    let last=0;
    await renderMedia({serveUrl,composition,outputLocation:path.join(root,'flight-silent.mp4'),codec:'h264',crf:17,pixelFormat:'yuv420p',imageFormat:'jpeg',jpegQuality:95,concurrency:4,x264Preset:'fast',puppeteerInstance:browser,browserExecutable,onProgress:({progress,renderedFrames})=>{if(Date.now()-last>12000){console.log(`${Math.round(progress*100)}% — ${renderedFrames}/720 frames`);last=Date.now();}}});
    console.log('Video render complete.');
  }
}finally{await browser.close({silent:true})}
