# Образ — AI студио на български

Astro + Cloudflare Workers AI + D1 + private R2. Тъмната/оранжева визия и стиловият слой са адаптирани от прикачения Optim AI Image Generator HTML/Tailwind шаблон. Оригиналният stylesheet и локалните icon fonts са в `public/template/`; английският демонстрационен JavaScript е заменен с реални функции. Картините в архива са предимно заместители, затова е добавена демонстрационна AI визия, обозначена като такава. Приложението генерира само чрез Cloudflare AI binding: Workers AI за FLUX и Cloudflare AI Gateway Unified Billing за third-party моделите.

## Какво работи

- Регистрация, вход, изход, D1 сесии с HttpOnly cookies; PBKDF2 пароли с отделен salt; Turnstile защита на регистрация и забравена парола при конфигурирани ключове. Без ключове регистрацията работи с IP/email rate limits и без безплатни AI кредити.
- Възстановяване на парола чрез Resend, еднократен линк за 30 минути и отмяна на старите сесии.
- 11 модела чрез AI binding: FLUX.1 Schnell, FLUX.2 Klein 4B/9B; GPT Image 2.5 Sunburst/Flare, Seedream 5 Pro, Grok Imagine Image 2.0, Recraft V4 SVG / Pro SVG, Nano Banana Pro / 2. Осемте модела от снимките използват Cloudflare Unified Billing, без отделни provider keys.
- Кредити и ограничено място, атомарни резервации, idempotency на заявки, връщане на кредити при грешка, до 2 едновременни заявки на потребител.
- PNG/JPEG/WebP и SVG резултати; резултатните URL адреси се изтеглят на сървъра и се записват в частен R2. SVG се показва като външен `<img>` и при директно отваряне се изолира с CSP sandbox. Никога не се вмъква като inline HTML.
- Частна библиотека, търсене, любими, страниране, изтегляне, повторна употреба на описание и изтриване с потвърждение.
- 3 месечни Stripe абонамента, Checkout, Customer Portal, подписан webhook, без двойно начисляване на платена фактура. Няма безплатни AI кредити при регистрация.
- Часово почистване на сесии, reset tokens и прекъснати генерации. Частните страници и изображения не се кешират публично.

## Деплой през Cloudflare GitHub интеграцията

Изберете **Workers**, не Pages. Новият Astro Cloudflare adapter поддържа Workers.

1. Cloudflare → Workers & Pages → Create → Import a repository → `radoslav1992/image-gen`; production branch **main**.
2. Настройки:

| Поле | Стойност |
|---|---|
| Root directory | `/` (коренът на хранилището) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | `24` (build variable `NODE_VERSION=24`) |

Wrangler е фиксиран в lockfile. Конфигурацията свързва AI, съществуващата D1 база `image-gen-bg` (ID `8f514fc3-16a6-40c3-aea9-16bbcb0096dd`) като `DB` и R2 bucket `image-gen-objects` като `IMAGES`. Деплойвайте в Cloudflare акаунта, в който се намират тези ресурси. Нужно е активирано R2 и Workers Paid за зададения CPU лимит и платени AI заявки. Свързването не създава таблици — изпълнете миграцията преди регистрация.

3. D1 → база `image-gen-bg` → Console: изпълнете **целия** файл `migrations/0001_initial.sql`, ако схемата още не е приложена. Алтернативно локално: `npm ci`, `npm run db:remote`. Не създавайте допълнителна база или bucket — конфигурацията вече сочи предоставените ресурси.
4. Попълнете настройките в `wrangler.jsonc` (GitHub редактор е достатъчен), след което направете commit. Cloudflare е source of truth за тайните. За обикновените variables използвайте **конфигурацията**, защото следващ deploy може да презапише стойности, въведени само в dashboard.

| Variable | Стойност / предназначение |
|---|---|
| `SITE_URL` | Пълният production origin, например `https://your-app.workers.dev`, **без наклонена черта накрая** |
| `AI_GATEWAY_ID` | ID на Gateway с Unified Billing за 8-те third-party модела; празно = тези модели са видими, но недостъпни |
| `IMAGE_RESULT_HOSTS` | Разрешени HTTPS result hosts, разделени със запетая; по подразбиране `examples.aig.cloudflare.com,*.r2.dev` |
| `REGISTRATION_ENABLED` | `true` |
| `BILLING_ENABLED` | `false` до завършен тест на Stripe; после `true` |
| `TURNSTILE_SITE_KEY` | Незадължителен публичен ключ за production hostname; добавете заедно с `TURNSTILE_SECRET_KEY` |
| `CONTACT_EMAIL` | Вашият реален имейл за поддръжка и лични данни |
| `STRIPE_PRICE_START` | Stripe месечна EUR price за €5.90 |
| `STRIPE_PRICE_CREATOR` | Stripe месечна EUR price за €14.90 |
| `STRIPE_PRICE_STUDIO` | Stripe месечна EUR price за €29.90 |

Secrets: Cloudflare → Worker → Settings → Variables and Secrets → Add (Encrypt):

| Secret | Кога е нужен |
|---|---|
| `TURNSTILE_SECRET_KEY` | Задължителен, когато е настроен Turnstile site key |
| `STRIPE_SECRET_KEY` | За Checkout / Portal / webhook sync |
| `STRIPE_WEBHOOK_SECRET` | За проверка на подписа |
| `RESEND_API_KEY` | За възстановяване на парола |
| `EMAIL_FROM` | Потвърден sender в Resend, например `Образ <noreply@your-domain.bg>` |

Ако Resend не е конфигуриран, възстановяването показва честно съобщение, че още не е активно. Не записвайте тайни в GitHub или в чата.

## Активиране на моделите от снимките

1. Cloudflare → AI Gateway → създайте gateway и заредете **Unified Billing** credits. Cloudflare начислява 5% при закупуването им. Не са необходими отделни OpenAI/Google/xAI/Recraft/ByteDance keys. Не включвайте „Require provider credentials“, когато използвате Cloudflare-managed credentials.
2. Попълнете `AI_GATEWAY_ID` в `wrangler.jsonc`. FLUX продължава да използва директния Workers AI billing; само осемте third-party модела се изпращат към gateway.
3. Настройте gateway spend limits и изключете съхранението на prompt/response logs, ако не ви е необходимо. Тествайте по една реална генерация с всеки модел преди активиране на продажбите. Наличността и account restrictions се управляват от Cloudflare.
4. Документираните Cloudflare резултати имат `state: Completed` и `result.image` с HTTPS URL. Приложението изтегля до 5 MB, валидира MIME и записва частно копие в R2. Проверява хоста и всеки redirect. Ако реалният result host е различен, логът показва **само hostname**; добавете точния доверен домейн в `IMAGE_RESULT_HOSTS` и деплойнете отново. Не добавяйте произволни домейни. Не е нужно да отваряте своя bucket публично.
5. Кредитите са фиксирани за всеки модел; клиентът не може да увеличи resolution, quality или броя изображения чрез API. За токенните модели бюджетът е оценка. Сверете Gateway usage с `docs/PRICING.md`, особено GPT Image 2.5, преди live billing. По-високо качество/размер изисква отделна калкулация и промяна на сървърните настройки.

## Stripe

1. Създайте три продукта с **EUR, monthly recurring, quantity 1**: Старт €5.90, Творец €14.90, Студио €29.90. Попълнете price IDs.
2. Активирайте Customer Portal. За първото издание разрешете прекратяване в края на периода и управление на платежни методи. **Изключете смяна на план / prorations в портала**; тя не е част от логиката за credits. За нов план потребителят прекратява текущия и след изтичане избира нов.
3. Webhook endpoint: `https://YOUR_DOMAIN/api/billing/webhook`; API version **2025-06-30.basil**. Събития: `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Checkout redirect не издава кредити. Webhook обработва само платени начални и периодични subscription фактури, без prorations и manual invoices. Начисляване е идемпотентно по invoice ID. При обновяване оставащите кредити се заменят с квотата за новия период (минус активни резервации).
5. Тествайте в test mode: покупка, webhook resend, подновяване, неуспешно плащане, прекратяване и private library между два профила. После заменете **всички** test keys, prices и webhook secret с live стойности.
6. Цените и калкулацията са в `docs/PRICING.md`. Обновете страниците `terms.astro` и `privacy.astro` с действителните данни на търговеца, контакти, крайни цени/данъчно представяне и приложимите условия преди продажби. Stripe Tax не е активиран автоматично. Refunds/chargebacks изискват операторска обработка и отмяна на права; няма автоматична интеграция за тях в първото издание.

## Ако регистрацията не работи

- След този commit изчакайте успешен Cloudflare deploy и презаредете страницата. При празни Turnstile ключове регистрацията е достъпна с IP/email rate limits. Настроената captcha остава задължителна.
- Ако е попълнен само един Turnstile ключ, попълнете и другия: публичния site key в `wrangler.jsonc`, secret key в Cloudflare Secrets. Разрешете hostname на сайта в настройките на widget-а. При нужда изчистете и двата ключа, за да използвате регистрацията с rate limits.
- Ако отговорът е „Възникна проблем“, проверете Worker logs за `no such table` и приложете `migrations/0001_initial.sql` в `image-gen-bg`, ако схемата още липсва. D1 binding сам по себе си не създава таблици.
- При „Невалиден произход“ проверете `SITE_URL`: точният адрес, от който отваряте сайта, без наклонена черта накрая. Празна стойност използва origin на текущата заявка.
- Паролата трябва да е 12–128 символа; името 2–80; отметката за условията е задължителна. При повторна регистрация със същия имейл използвайте вход. Ограниченията са 20 заявки на IP и 8 на имейл за 10 минути; изчакайте след много опити.

## Локално

```bash
npm ci
npm run db:local
cp .dev.vars.example .dev.vars
npm run dev
```

Публичните страници работят без Stripe secrets. Регистрацията работи на localhost и production с ограничения на заявките, когато и двата Turnstile ключа липсват. Ако добавите един ключ, трябва да добавите и другия; при конфигурирани ключове captcha е задължителна и се проверява на сървъра, включително hostname. Неуспешна проверка не се пропуска. AI binding използва Cloudflare и за реална генерация локално е нужна авторизация към Cloudflare; локалните smoke tests не правят платени AI заявки.

```bash
npm run check
npm test
npm run build
npm run smoke
npm run preview
```

## Граници на първото издание

Генерирането е синхронна заявка: браузърът остава отворен до резултат. При прекъсване първо проверете библиотеката; повторение със същия request key не генерира втори път. Прекъснати pending заявки се възстановяват от cron след 30 минути (cron е на всеки час). Изходите са квадратни: стандартен размер за Schnell, 1K растер за останалите и 2048 SVG за Recraft Pro. Няма image editing, upscaling или настройка за прозрачност. Не обещаваме че моделите ще изписват правилно български текст в изображението.

За тестови credits **само локално**:
```bash
npx wrangler d1 execute DB --local --command="UPDATE users SET credits=100 WHERE email='your-test@example.com'"
```

Изходите са ограничени до 5 MB. R2 е частен; не включвайте public bucket access. Схемата запазва metadata tombstones за idempotency и accounting. Часовият cron не изтрива потребителски изображения. `npm run smoke` тества built Worker в изолиран Miniflare: вход/изход, български страници, CSRF, частни R2 изображения между два профила, връщане на кредити при грешка и изтриване. Няма заявки към платени услуги.

Тестовете проверяват overspend, еднократни refunds, storage reservations, deletion, duplicate invoice accounting, URL/base64 outputs, redirect allowlist, streaming лимит и SVG MIME/CSP. Реална AI генерация и Stripe плащане изискват конфигурираните акаунти и са финалният acceptance test след deploy.
