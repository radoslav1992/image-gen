import type {APIContext} from 'astro';
import {bindings,hash,id,now,fail} from './server';
import {validateTurnstile} from './turnstile';
const ITERATIONS=100000;
export async function passwordHash(password:string,salt:string=crypto.randomUUID()){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:ITERATIONS,hash:'SHA-256'},key,256);return `${salt}:${Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('')}`;}
export async function passwordMatches(password:string,stored:string){const calculated=await passwordHash(password,stored.split(':')[0]);let diff=calculated.length^stored.length;for(let i=0;i<stored.length;i++)diff|=stored.charCodeAt(i)^(calculated.charCodeAt(i)||0);return diff===0;}
export async function session(ctx:APIContext,userId:string){const token=id()+id();await bindings().DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await hash(token),userId,now()+86400*30).run();ctx.cookies.set('obraz_session',token,{path:'/',httpOnly:true,secure:new URL(ctx.request.url).protocol==='https:',sameSite:'lax',maxAge:86400*30});}
export async function turnstile(ctx:APIContext,token:unknown){const e=bindings();const result=await validateTurnstile({siteKey:e.TURNSTILE_SITE_KEY,secretKey:e.TURNSTILE_SECRET_KEY},ctx.request,token);if(!result.ok)fail(result.status,result.error);}
