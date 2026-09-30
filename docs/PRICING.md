# Ценообразуване — Образ

Проверено на 1 октомври 2026 г. Месечни цени в EUR; себестойност на доставчиците в USD. Не използваме безплатните квоти при изчисленията. Преди реални продажби потвърдете данъчния режим и крайното представяне на цените в Stripe.

## Модели — Cloudflare AI каталог

Един резултат на заявка. Параметрите са фиксирани на сървъра: квадрат, 1K за растерните модели; Recraft Pro SVG 2048×2048. Schnell използва стандартния размер и 4 стъпки; Klein използва multipart с width/height 1024. GPT Image 2.5 използва **medium**, без auto/max. Grok използва low/1k. Google Search, image search, редактиране с референтни изображения и 2K/4K растерни изходи са изключени.

Трите FLUX модела се изпълняват в Workers AI. Останалите осем са third-party модели в каталога на Cloudflare, извиквани със същия AI binding през AI Gateway Unified Billing. Няма директни API ключове за отделните доставчици. **Unified Billing добавя 5% такса при закупуване на кредити** — тя е включена в бюджета по-долу за тези осем модела. FLUX използва директно Workers AI billing, без gateway.

| Модел | Цена / планов бюджет USD преди 5% | Бюджет с такса USD | Кредити | USD/кредит |
|---|---:|---:|---:|---:|
| FLUX.1 Schnell | 4 × 0.0000528 + 4 × 0.0001056 = 0.0006336 | 0.0006336 | 1 | 0.0006336 |
| FLUX.2 Klein 4B | 4 × 0.000287 = 0.001148 | 0.001148 | 2 | 0.000574 |
| FLUX.2 Klein 9B | 0.015 за първия MP | 0.015 | 20 | 0.000750 |
| GPT Image 2.5 Sunburst | **0.25 планов бюджет** | 0.2625 | 400 | 0.00065625 |
| GPT Image 2.5 Flare | **0.25 планов бюджет** | 0.2625 | 400 | 0.00065625 |
| Seedream 5 Pro | 0.045 / изображение | 0.04725 | 70 | 0.000675 |
| Grok Imagine Image 2.0 | 0.04 / изображение при low/1k | 0.042 | 60 | 0.000700 |
| Recraft V4 SVG | 0.08 / изображение | 0.084 | 120 | 0.000700 |
| Recraft V4 Pro SVG | 0.30 / изображение | 0.315 | 450 | 0.000700 |
| Nano Banana Pro | **0.15 планов бюджет** | 0.1575 | 240 | 0.00065625 |
| Nano Banana 2 | **0.08 планов бюджет** | 0.084 | 120 | 0.000700 |

**Токенните бюджети не са фиксирани цени на доставчиците или гарантирани максимуми.** GPT Image 2.5: $5/M text input tokens, $30/M image output tokens. $0.25 е консервативна начална оценка за medium/1024 и описание до 1500 символа плюс краткия стил, а не доказана горна граница; официалната документация не дава точна фиксирана цена за този профил. Не използвайте калкулатора за GPT Image 2 за оценка на GPT Image 2.5 — OpenAI изрично ги различава. Валидирайте реалните токени и разходи в Gateway преди live продажби и при нужда повишете кредитната цена в `src/lib/catalog.ts`.

Nano Banana Pro: $2/M input, $120/M output. При 1K Google описва 1120 image output tokens = $0.1344; бюджетът $0.15 включва предпоставка за входни токени. Nano Banana 2: $0.50/M input, $60/M output; 1120 image tokens = $0.0672, с планов резерв до $0.08. Google може да отчита и други токени; потвърдете целия разход от Cloudflare, не само image tokens. Не използваме кеш отстъпки в оценката.

Schnell използва официалните tile + step компоненти и предполага стандартен квадратен изход; схемата му не предлага width/height. Проверете първите реални резултати. Cloudflare може да таксува заявка, която впоследствие не е запазена успешно, въпреки че приложението връща потребителските кредити. Настройте spend limits в AI Gateway и наблюдавайте грешките и реалните сметки.

## Инфраструктура и резерв

- Workers Paid: базово $5/месец за акаунта, включва 10M заявки и 30M CPU ms. Над квотата: $0.30/M заявки и $0.02/M CPU ms. Ако акаунтът вече има Paid, това не е допълнителен $5 на приложението.
- D1 Paid: включени 25B прочетени реда, 50M записани реда, 5 GB. Над тях $0.001/M read rows, $1/M write rows и $0.75/GB-month. Индексирани потребителски заявки и страниране на 24 изображения.
- R2 Standard: $0.015/GB-month, $4.50/M Class A, $0.36/M Class B, без egress такса. Изтриване: без такса. За най-лошия случай смятаме цялото място от плана за използвано.
- Приблизителен резерв $0.10/потребител за заявки, R2 операции и D1; $0.50/потребител дял от фиксираните $5 при 10 платени потребители. При по-малко клиенти приложението може да е на загуба заради фиксираните разходи.
- За валутен риск смятаме условно $1 = €1 (планова предпоставка, не борсов курс). Добавяме 20% резерв върху AI + storage + operations + fixed allocation.
- 2.9% + €0.30 е предпазен платежен резерв, не твърдение за конкретната тарифа на Stripe акаунта. Реалните такси зависят от картите и условията ви. Не са включени маркетинг, човешка поддръжка или счетоводство.

| План | Цена EUR | Кредити | Място | Планов AI бюджет USD | R2 USD | Резерв операции + fixed USD | Cloudflare cost с 20% резерв EUR | Платежен резерв EUR | Остатък преди данъци/бизнес разходи EUR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Старт | 5.90 | 1000 | 1 GB | 0.75 | 0.015 | 0.60 | 1.64 | 0.47 | 3.79 |
| Творец | 14.90 | 3000 | 5 GB | 2.25 | 0.075 | 0.60 | 3.51 | 0.73 | 10.66 |
| Студио | 29.90 | 7000 | 15 GB | 5.25 | 0.225 | 0.60 | 7.29 | 1.17 | 21.44 |

Това е оценка при посочените бюджети, не гарантирана горна граница или обещание за марж. При максимален разход от $0.00075/кредит по тази оценка плановете остават същите; токенните модели трябва да бъдат сверени с реалните сметки. Данъци не са извадени от последната колона. Кредитите се подновяват (не се натрупват) само с invoice.paid за subscription_create/subscription_cycle. Няма безплатни AI кредити при регистрация. Всички платени планове имат достъп до 11 модела след активиране на AI Gateway. Неуспешна заявка връща кредитите; за прекъсната заявка часовият cron възстановява кредитите след 30 минути. Изображенията остават достъпни след изтичане на абонамента, но ново генериране е блокирано. Мястото се намалява до 100 MB; няма автоматично изтриване на резултати.

## Източници

- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
- https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/
- https://developers.cloudflare.com/workers-ai/models/flux-2-klein-9b/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/

- https://developers.cloudflare.com/ai/models/
- https://developers.cloudflare.com/ai-gateway/features/unified-billing/
- https://developers.cloudflare.com/ai/models/openai/gpt-image-2.5-sunburst/
- https://developers.cloudflare.com/ai/models/openai/gpt-image-2.5-flare/
- https://developers.cloudflare.com/ai/models/bytedance/seedream-5-pro/
- https://developers.cloudflare.com/ai/models/xai/grok-imagine-image-2.0/
- https://developers.cloudflare.com/ai/models/recraft/recraftv4-vector/
- https://developers.cloudflare.com/ai/models/recraft/recraftv4-pro-vector/
- https://developers.cloudflare.com/ai/models/google/nano-banana-pro/
- https://developers.cloudflare.com/ai/models/google/nano-banana-2/
- https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
- https://ai.google.dev/gemini-api/docs/pricing
