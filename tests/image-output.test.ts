import {test} from 'node:test';
import assert from 'node:assert/strict';
import {imageOutput,allowedImageUrl} from '../src/lib/image-output';
import {MAX_IMAGE_BYTES,MODELS} from '../src/lib/catalog';
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0]);
test('native base64 and unified Completed URL outputs become private storage bytes',async()=>{
 const native=await imageOutput({image:Buffer.from(png).toString('base64')});assert.equal(native.mime,'image/png');
 const external=await imageOutput({state:'Completed',result:{image:'https://images.r2.dev/result.png'}},'*.r2.dev',async()=>new Response(png) as never);
 assert.deepEqual(external.bytes,png);assert.equal(external.mime,'image/png');
 await assert.rejects(imageOutput({state:'Failed',result:{image:'https://images.r2.dev/result.png'}}));
});
test('result URLs require approved HTTPS hosts, including every redirect',async()=>{
 for(const url of ['http://images.r2.dev/x','https://127.0.0.1/x','https://images.r2.dev.evil.test/x','https://localhost/x','https://user:pass@images.r2.dev/x'])assert.throws(()=>allowedImageUrl(url,'*.r2.dev'));
 await assert.rejects(imageOutput({result:{image:'https://images.r2.dev/x'}},'*.r2.dev',async()=>new Response(null,{status:302,headers:{Location:'https://evil.test/x'}})),/not allowed/);
});
test('streamed outputs exceeding storage reservation are rejected',async()=>{
 await assert.rejects(imageOutput({result:{image:'https://images.r2.dev/x'}},'*.r2.dev',async()=>new Response(new Uint8Array(MAX_IMAGE_BYTES+1))),/too large/);
});
test('SVG stays a separate sandboxed resource and XML entity declarations are rejected',async()=>{
 const svg='<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L1 1"/></svg>';
 const output=await imageOutput({result:{image:'https://images.r2.dev/x.svg'}},'*.r2.dev',async()=>new Response(svg));assert.equal(output.mime,'image/svg+xml');
 await assert.rejects(imageOutput({image:Buffer.from('<!DOCTYPE svg><svg></svg>').toString('base64')}),/Unsupported/);
});
test('all requested catalog models have server-controlled quality and one output',()=>{
 assert.equal(Object.keys(MODELS).length,11);assert.equal(MODELS.sunburst.input.quality,'medium');assert.equal(MODELS.banana2.input.resolution,'1K');assert.equal(MODELS.bananaPro.input.image_size,'1K');
 for(const m of Object.values(MODELS)){assert.ok(Number.isInteger(m.credits)&&m.credits>0);assert.ok(m.usd/m.credits<=.00075+Number.EPSILON);}
});
