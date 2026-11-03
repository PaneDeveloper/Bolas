import {parentPort} from "node:worker_threads";
parentPort.on("message",({buffer,width,step,yStart,yEnd})=>{
 try{
  const data=new Uint8Array(buffer),points=[];
  for(let y=yStart;y<yEnd;y+=step)for(let x=0;x<width;x+=step){
   const i=(y*width+x)*4;
   if(data[i+3]>120)points.push({x,y,r:data[i],g:data[i+1],b:data[i+2]});
  }
  parentPort.postMessage({points});
 }catch(error){parentPort.postMessage({error:error.message});}
});
