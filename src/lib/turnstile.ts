export interface TurnstileConfig {siteKey?:string;secretKey?:string}
type Validation={ok:true}|{ok:false;status:400|503;error:string};
const failure=(status:400|503,error:string):Validation=>({ok:false,status,error});

export async function validateTurnstile(config:TurnstileConfig,request:Request,token:unknown,fetcher:typeof fetch=fetch):Promise<Validation>{
 const siteKey=config.siteKey?.trim();const secretKey=config.secretKey?.trim();
 // With no widget configured, use the auth endpoint's IP/email rate limits.
 // A partially configured or failing widget must never silently disable verification.
 if(!siteKey&&!secretKey)return {ok:true};
 if(!siteKey||!secretKey)return failure(503,'Защитата на формата временно е недостъпна. Опитайте по-късно.');
 if(typeof token!=='string'||!token.trim()||token.length>2048)return failure(400,'Потвърдете, че не сте робот.');
 try{
  const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',signal:AbortSignal.timeout(10_000),
   body:new URLSearchParams({secret:secretKey,response:token,remoteip:request.headers.get('cf-connecting-ip')||''})
  });
  if(!response.ok)return failure(503,'Проверката временно е недостъпна. Опитайте отново.');
  const result=await response.json() as {success?:boolean;hostname?:string};
  if(result.success!==true||result.hostname!==new URL(request.url).hostname)return failure(400,'Потвърдете, че не сте робот.');
  return {ok:true};
 }catch{return failure(503,'Проверката временно е недостъпна. Опитайте отново.');}
}
