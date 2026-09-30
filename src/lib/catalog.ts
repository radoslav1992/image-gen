export interface ModelSpec {id:string;name:string;label:string;credits:number;usd:number;multipart:boolean;thirdParty:boolean;format:string;input:Record<string,unknown>}
// usd is a planning budget, including the 5% Unified Billing fee for third-party models.
// Token-billed image budgets are estimates at the fixed settings below, not provider flat prices.
export const MODELS = {
  schnell:{id:'@cf/black-forest-labs/flux-1-schnell',name:'FLUX.1 Schnell',label:'Бързи идеи',credits:1,usd:0.0006336,multipart:false,thirdParty:false,format:'Стандартен квадрат',input:{steps:4}},
  klein:{id:'@cf/black-forest-labs/flux-2-klein-4b',name:'FLUX.2 Klein 4B',label:'Повече детайли',credits:2,usd:0.001148,multipart:true,thirdParty:false,format:'1024 × 1024',input:{}},
  pro:{id:'@cf/black-forest-labs/flux-2-klein-9b',name:'FLUX.2 Klein 9B',label:'Премиум FLUX',credits:20,usd:0.015,multipart:true,thirdParty:false,format:'1024 × 1024',input:{}},
  sunburst:{id:'openai/gpt-image-2.5-sunburst',name:'GPT Image 2.5 Sunburst',label:'Прецизна композиция',credits:400,usd:0.2625,multipart:false,thirdParty:true,format:'1024 × 1024 · средно качество',input:{quality:'medium',size:'1024x1024',output_format:'jpeg'}},
  flare:{id:'openai/gpt-image-2.5-flare',name:'GPT Image 2.5 Flare',label:'Творчески визии',credits:400,usd:0.2625,multipart:false,thirdParty:true,format:'1024 × 1024 · средно качество',input:{quality:'medium',size:'1024x1024',output_format:'jpeg'}},
  seedream:{id:'bytedance/seedream-5-pro',name:'Seedream 5 Pro',label:'Продуктови визии',credits:70,usd:0.04725,multipart:false,thirdParty:true,format:'1024 × 1024',input:{size:'1024x1024',watermark:false}},
  grok:{id:'xai/grok-imagine-image-2.0',name:'Grok Imagine Image 2.0',label:'Ясни детайли',credits:60,usd:0.042,multipart:false,thirdParty:true,format:'1K · ниско качество',input:{aspect_ratio:'1:1',quality:'low',resolution:'1k'}},
  recraft:{id:'recraft/recraftv4-vector',name:'Recraft V4 SVG',label:'Векторни илюстрации',credits:120,usd:0.084,multipart:false,thirdParty:true,format:'SVG · 1024 × 1024',input:{size:'1024x1024'}},
  recraftPro:{id:'recraft/recraftv4-pro-vector',name:'Recraft V4 Pro SVG',label:'Детайлни вектори',credits:450,usd:0.315,multipart:false,thirdParty:true,format:'SVG · 2048 × 2048',input:{size:'2048x2048'}},
  bananaPro:{id:'google/nano-banana-pro',name:'Nano Banana Pro',label:'Продуктови детайли',credits:240,usd:0.1575,multipart:false,thirdParty:true,format:'1K · квадрат',input:{aspect_ratio:'1:1',image_size:'1K',output_format:'png'}},
  banana2:{id:'google/nano-banana-2',name:'Nano Banana 2',label:'Бърза творческа работа',credits:120,usd:0.084,multipart:false,thirdParty:true,format:'1K · квадрат',input:{aspect_ratio:'1:1',resolution:'1K',output_format:'png',google_search:false,image_search:false}}
} satisfies Record<string,ModelSpec>;
export type ModelKey=keyof typeof MODELS;
export const PLANS={
  start:{name:'Старт',price:5.90,credits:1000,storage:1_000_000_000,description:'За идеи, които заслужават образ.'},
  creator:{name:'Творец',price:14.90,credits:3000,storage:5_000_000_000,description:'За съдържание, което се откроява.'},
  studio:{name:'Студио',price:29.90,credits:7000,storage:15_000_000_000,description:'За ежедневната работа на вашия бранд.'}
} as const;
export type PlanKey=keyof typeof PLANS;
export const MAX_IMAGE_BYTES=5_000_000;
export const STYLES={none:'',photo:'Photorealistic editorial photography, natural textures, cinematic lighting.',cinema:'Cinematic scene, dramatic lighting, film color grading.',illustration:'Expressive editorial illustration, beautiful colors, clean composition.',render:'Premium 3D render, detailed materials, studio lighting.',anime:'Anime illustration, detailed environment, expressive lighting.'} as const;
export const euro=(n:number)=>new Intl.NumberFormat('bg-BG',{style:'currency',currency:'EUR'}).format(n);
