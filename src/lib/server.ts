import { env } from 'cloudflare:workers';
import type { APIContext } from 'astro';
export interface Bindings {DB:D1Database;IMAGES:R2Bucket;AI:Ai;AI_GATEWAY_ID?:string;IMAGE_RESULT_HOSTS?:string;SITE_URL:string;BILLING_ENABLED:string;REGISTRATION_ENABLED:string;STRIPE_SECRET_KEY?:string;STRIPE_WEBHOOK_SECRET?:string;STRIPE_PRICE_START?:string;STRIPE_PRICE_CREATOR?:string;STRIPE_PRICE_STUDIO?:string;TURNSTILE_SITE_KEY?:string;TURNSTILE_SECRET_KEY?:string;RESEND_API_KEY?:string;EMAIL_FROM?:string;CONTACT_EMAIL?:string}
export const bindings=()=>env as unknown as Bindings;
export type User={id:string;email:string;name:string;password_hash:string;credits:number;plan:string;storage_limit:number;storage_used:number;storage_reserved:number;stripe_customer:string|null;stripe_subscription:string|null;period_end:number|null;subscription_status:string|null};
export const now=()=>Math.floor(Date.now()/1000);
export const id=()=>crypto.randomUUID();
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('')}
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}})}
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export function fail(status:number,message:string):never{throw new HttpError(status,message)}
export async function body(request:Request){if(Number(request.headers.get('content-length')||0)>12000)fail(413,'Заявката е твърде голяма.');const raw=await request.text();if(raw.length>12000)fail(413,'Заявката е твърде голяма.');try{return JSON.parse(raw)}catch{fail(400,'Невалидна заявка.')}}
export function sameOrigin(request:Request){const expected=bindings().SITE_URL||new URL(request.url).origin; if(request.headers.get('origin')!==expected)fail(403,'Невалиден произход на заявката.');}
export async function userFor(ctx:APIContext){const token=ctx.cookies.get('obraz_session')?.value;if(!token)return null;return bindings().DB.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token),now()).first<User>();}
export async function requireUser(ctx:APIContext){const u=await userFor(ctx);if(!u)fail(401,'Влезте в профила си.');return u;}
export function endpoint(fn:(ctx:APIContext)=>Promise<Response>){return async(ctx:APIContext)=>{try{return await fn(ctx)}catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);console.error('Request failed',e instanceof Error?e.message:'unknown');return json({error:'Възникна проблем. Опитайте отново.'},500)}}}
export async function limit(key:string,count:number,seconds:number){const db=bindings().DB;const bucket=Math.floor(now()/seconds);const keyHash=await hash(key);const r=await db.prepare('INSERT INTO rate_limits (key,bucket,hits,expires_at) VALUES (?,?,1,?) ON CONFLICT(key,bucket) DO UPDATE SET hits=hits+1 RETURNING hits').bind(keyHash,bucket,now()+seconds*2).first<{hits:number}>();if((r?.hits||0)>count)fail(429,'Твърде много опити. Опитайте по-късно.');}
export function privateHeaders(){return {'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}
