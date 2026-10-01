import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateTurnstile} from '../src/lib/turnstile';
const request=new Request('https://image-gen.example/api/auth/register',{headers:{'cf-connecting-ip':'192.0.2.1'}});
const keys={siteKey:'site-key',secretKey:'secret-key'};
test('production registration allows unconfigured Turnstile without making a validation request',async()=>{
 let called=false;assert.deepEqual(await validateTurnstile({},request,undefined,async()=>{called=true;throw new Error();}),{ok:true});assert.equal(called,false);
});
test('partially configured Turnstile fails closed instead of quietly bypassing captcha',async()=>{
 for(const config of [{siteKey:'site-key'},{secretKey:'secret-key'}]){const result=await validateTurnstile(config,request,'token');assert.equal(result.ok,false);if(!result.ok)assert.equal(result.status,503);}
});
test('configured captcha rejects missing and oversized tokens before calling Cloudflare',async()=>{
 for(const token of [undefined,'',' ', 'x'.repeat(2049)]){const result=await validateTurnstile(keys,request,token,async()=>{throw new Error('must not call');});assert.equal(result.ok,false);if(!result.ok)assert.equal(result.status,400);}
});
test('configured captcha validates on the server and checks the result hostname',async()=>{
 let sent:URLSearchParams|undefined;const result=await validateTurnstile(keys,request,'valid-token',async(url,options)=>{assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(options?.method,'POST');sent=options?.body as URLSearchParams;return Response.json({success:true,hostname:'image-gen.example'});});assert.deepEqual(result,{ok:true});assert.equal(sent?.get('secret'),'secret-key');assert.equal(sent?.get('response'),'valid-token');assert.equal(sent?.get('remoteip'),'192.0.2.1');
 for(const output of [{success:false},{success:true,hostname:'other.example'},{success:true}]){const result=await validateTurnstile(keys,request,'token',async()=>Response.json(output));assert.equal(result.ok,false);if(!result.ok)assert.equal(result.status,400);}
});
test('validation errors and service failures never allow a configured captcha to be bypassed',async()=>{
 for(const fetcher of [async()=>new Response('unavailable',{status:503}),async()=>new Response('not JSON'),async()=>{throw new Error('network failure');}]){const result=await validateTurnstile(keys,request,'token',fetcher);assert.equal(result.ok,false);if(!result.ok)assert.equal(result.status,503);}
});
