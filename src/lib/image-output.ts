import {MAX_IMAGE_BYTES} from './catalog';

/** Accept only documented Cloudflare outputs. Provider URLs never reach the browser. */
export async function imageOutput(output:unknown,hosts='examples.aig.cloudflare.com,*.r2.dev',fetcher:typeof fetch=fetch){
 const data=output as {state?:string;result?:{image?:string};image?:string};
 if(data?.state && data.state!=='Completed')throw new Error(`Model did not complete: ${data.state}`);
 const source=data?.result?.image||data?.image;
 if(typeof source!=='string'||!source)throw new Error('No image returned');
 let bytes:Uint8Array;
 if(/^https?:/i.test(source))bytes=await downloadImage(source,hosts,fetcher);
 else{
  const raw=source.replace(/^data:image\/[\w.+-]+;base64,/, '');
  if(raw.length>Math.ceil(MAX_IMAGE_BYTES*4/3)+4)throw new Error('Image too large');
  bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));
 }
 if(!bytes.byteLength||bytes.byteLength>MAX_IMAGE_BYTES)throw new Error('Image size outside limits');
 const mime=imageMime(bytes);if(!mime)throw new Error('Unsupported image format');
 return {bytes,mime};
}
export function allowedImageUrl(value:string,hosts:string){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))throw new Error('Unsafe result URL');
 const host=url.hostname.toLowerCase();
 if(/^[\d.]+$/.test(host)||host.includes(':')||host==='localhost'||/\.(local|internal|localhost)$/.test(host))throw new Error('Unsafe result host');
 const allowed=hosts.split(',').map(h=>h.trim().toLowerCase()).filter(Boolean).some(h=>h.startsWith('*.')?host.endsWith(h.slice(1))&&host!==h.slice(2):host===h);
 if(!allowed)throw new Error(`Result host is not allowed: ${host}`);
 return url;
}
async function downloadImage(source:string,hosts:string,fetcher:typeof fetch){
 // Validate every redirect. Never forward auth headers to result URLs.
 let url=allowedImageUrl(source,hosts);const signal=AbortSignal.timeout(30_000);
 for(let redirects=0;redirects<=3;redirects++){
  const response=await fetcher(url,{redirect:'manual',signal});
  if([301,302,303,307,308].includes(response.status)){
   await response.body?.cancel();const location=response.headers.get('location');if(!location)throw new Error('Invalid result redirect');url=allowedImageUrl(new URL(location,url).href,hosts);continue;
  }
  if(!response.ok||!response.body)throw new Error('Result download failed');
  if(Number(response.headers.get('content-length')||0)>MAX_IMAGE_BYTES){await response.body.cancel();throw new Error('Image too large');}
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_IMAGE_BYTES)throw new Error('Image too large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(size);let position=0;for(const chunk of chunks){bytes.set(chunk,position);position+=chunk.byteLength;}return bytes;
 }
 throw new Error('Too many result redirects');
}
export function imageMime(bytes:Uint8Array){
 if([137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))return 'image/png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(new TextDecoder().decode(bytes.subarray(0,4))==='RIFF'&&new TextDecoder().decode(bytes.subarray(8,12))==='WEBP')return 'image/webp';
 const text=new TextDecoder().decode(bytes).trimStart().replace(/^<\?xml[^>]*\?>\s*/i,'').replace(/^(?:<!--[\s\S]*?-->\s*)+/,'');
 // Keep SVG as an external img, never inline HTML. Its route enforces a sandbox CSP.
 if(/^<svg(?:\s|>)/i.test(text)&&!/<!(?:DOCTYPE|ENTITY)/i.test(text))return 'image/svg+xml';
 return null;
}
