import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const files=['dist/server/entry.mjs','dist/server/virtual_astro_middleware.mjs',...readdirSync('dist/server/chunks').map(x=>`dist/server/chunks/${x}`)];
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'app',modules:files.map(path=>({type:'ESModule',path:resolve(path)})),compatibilityDate:'2026-09-30',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['IMAGES'],bindings:{SITE_URL:'',BILLING_ENABLED:'false',REGISTRATION_ENABLED:'true'},assets:{directory:'dist/client',binding:'ASSETS',routerConfig:{has_user_worker:true}}}]}));
const origin='http://localhost';
async function request(path,method='GET',data,cookie,customOrigin=origin){return mf.dispatchFetch(origin+path,{method,headers:{...(data?{'Content-Type':'application/json',Origin:customOrigin}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined,redirect:'manual'});}
try{
 const db=await mf.getD1Database('DB');await db.exec(readFileSync('migrations/0001_initial.sql','utf8'));
 for(const path of ['/','/login','/register','/pricing','/terms','/privacy']){const r=await request(path);assert.equal(r.status,200,path);const html=await r.text();assert.ok(html.includes('lang="bg"'));}
 assert.equal((await request('/studio')).status,302);assert.equal((await request('/api/me')).status,401);
 const signup=await request('/api/auth/register','POST',{name:'Тест Потребител',email:'test@example.bg',password:'long-password-for-test',terms:true});assert.equal(signup.status,200,await signup.text());const cookie=signup.headers.get('set-cookie').split(';')[0];assert.ok(signup.headers.get('set-cookie').includes('HttpOnly'));
 const studio=await request('/studio','GET',undefined,cookie);assert.equal(studio.status,200);assert.ok((await studio.text()).includes('GPT Image 2.5 Sunburst'));assert.equal((await request('/library','GET',undefined,cookie)).status,200);assert.equal((await request('/account','GET',undefined,cookie)).status,200);
 assert.equal((await request('/api/generate','POST',{prompt:'test scene',model:'klein',style:'none',requestKey:'12345678-1234-1234-1234-123456789012'},cookie)).status,402);
 assert.equal((await request('/api/auth/logout','POST',{},cookie,'http://evil.example')).status,403);
 const login=await request('/api/auth/login','POST',{email:'test@example.bg',password:'long-password-for-test'});assert.equal(login.status,200);
 const badLogin=await request('/api/auth/login','POST',{email:'test@example.bg',password:'wrong-password'});assert.equal(badLogin.status,401);
 const uid=await db.prepare('SELECT id FROM users WHERE email=?').bind('test@example.bg').first();await db.prepare('UPDATE users SET credits=100 WHERE id=?').bind(uid.id).run();
 const disabled=await request('/api/generate','POST',{prompt:'test scene',model:'sunburst',style:'none',requestKey:'12345678-1234-1234-1234-123456789014'},cookie);assert.equal(disabled.status,503);assert.equal((await db.prepare('SELECT credits FROM users WHERE id=?').bind(uid.id).first()).credits,100);
 // No AI binding in this isolated test. Provider failure must refund the reservation.
 const generate=await request('/api/generate','POST',{prompt:'test scene',model:'klein',style:'none',requestKey:'12345678-1234-1234-1234-123456789013'},cookie);assert.equal(generate.status,502);assert.equal((await db.prepare('SELECT credits FROM users WHERE id=?').bind(uid.id).first()).credits,100);
 const key=`${uid.id}/private-test`;await (await mf.getR2Bucket('IMAGES')).put(key,'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');await db.prepare("INSERT INTO images(id,user_id,request_key,prompt,style,model,cost,key,created_at) VALUES('private-test',?,'private-test-key','test','none','klein',2,?,1)").bind(uid.id,key).run();await db.prepare("UPDATE images SET status='complete',bytes=10,mime='image/svg+xml' WHERE id='private-test'").run();
 const svg=await request('/api/images/private-test','GET',undefined,cookie);assert.equal(svg.status,200);assert.ok(svg.headers.get('content-security-policy').startsWith('sandbox;'));assert.equal(svg.headers.get('content-type'),'image/svg+xml');const download=await request('/api/images/private-test?download=1','GET',undefined,cookie);assert.ok(download.headers.get('content-disposition').endsWith('.svg"'));assert.equal((await request('/api/images/private-test')).status,401);
 const second=await request('/api/auth/register','POST',{name:'Друг Потребител',email:'other@example.bg',password:'another-long-test-password',terms:true});const otherCookie=second.headers.get('set-cookie').split(';')[0];assert.equal((await request('/api/images/private-test','GET',undefined,otherCookie)).status,404);
 assert.equal((await request('/api/images/private-test','PATCH',{},cookie)).status,200);assert.equal((await request('/api/images/private-test','DELETE',{},cookie)).status,200);assert.equal((await request('/api/images/private-test','GET',undefined,cookie)).status,404);
 await request('/api/auth/logout','POST',{},cookie);assert.equal((await request('/api/me','GET',undefined,cookie)).status,401);
 console.log('Runtime smoke passed: Bulgarian pages, auth, sessions, CSRF, credits, refund, private R2 ownership, favorite, delete, logout. No paid services called.');
}finally{await mf.dispose();}
