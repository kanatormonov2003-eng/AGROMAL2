# Настройка AGROMAL MVP

## 1. Создать Supabase project

Создайте проект и сохраните Project URL и anon/public key. Никогда не копируйте
`service_role` в HTML или `assets/js/config.js`.

В SQL Editor последовательно выполните:

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/seed.sql`

## 2. Настроить frontend config

Заполните `assets/js/config.js` по образцу `assets/js/config.example.js`:

- `supabaseUrl` — Project URL;
- `supabaseAnonKey` — anon/public key;
- оба WhatsApp-номера — international format, digits only;
- `siteUrl` — production origin.

`.env.example` перечисляет те же deployment variables. Поскольку browser не
читает `.env`, hosting pipeline должен сгенерировать `config.js` или он
заполняется перед deployment. Anon key публичен по дизайну; безопасность даёт RLS.

## 3. Создать bootstrap admin

Edge Function может создавать последующих пользователей, но первый admin
создаётся вручную один раз.

1. Supabase Dashboard → Authentication → Users → Add user.
2. Email должен иметь формат `inn.<ИНН>@login.agromal.kg`, например для
   тестового ИНН `2026101015`: `inn.2026101015@login.agromal.kg`.
3. Установите **собственный DEMO ONLY пароль**, включите email confirmation.
4. Скопируйте UUID созданного Auth user.
5. Выполните, подставив UUID и тестовые значения:

```sql
with organization as (
  insert into public.organizations (company_name, inn, status)
  values ('AGROMAL Demo Admin', '2026101015', 'active')
  returning id
)
insert into public.profiles (id, organization_id, full_name, login_email, role)
select
  'AUTH_USER_UUID'::uuid,
  id,
  'Demo Administrator',
  'inn.2026101015@login.agromal.kg',
  'admin'
from organization;
```

Это demo data. Не используйте указанный ИНН или пароль для production account.
Пароль нигде в репозитории не сохраняется.

## 4. Deploy Edge Function

При установленном Supabase CLI:

```bash
supabase functions deploy manage-user
supabase secrets set SITE_URL=https://agromal.kg
```

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` предоставляются Supabase Function
runtime. Для локальной разработки разрешены origins `localhost:8000` и
`127.0.0.1:8000`.

## 5. Создать Demo Buyer

Войдите bootstrap admin, откройте `admin.html`, заполните organization, INN,
имя, роль Buyer и временный пароль (минимум 12 символов). UI вызовет Edge
Function. Она создаст Auth user, затем одной SQL-транзакцией создаст organization
и profile; при SQL-ошибке Auth user будет удалён компенсирующей операцией.
Передайте временный пароль только по защищённому каналу.

## 6. Auth smoke test

- открыть `index.html`;
- неверный пароль отклоняется;
- buyer login открывает dashboard;
- refresh сохраняет session в текущей вкладке;
- logout закрывает dashboard;
- прямое открытие dashboard без session возвращает на login;
- buyer при открытии admin получает forbidden redirect;
- blocked organization после login получает понятный отказ и sign out.

## 7. Buyer/Admin test

Buyer: проверить загрузку DEMO-лотов, status labels, active proposal только у
`available` и корректный lot number в WhatsApp URL.

Admin: создать лот, изменить его и статус, проверить dashboard buyer, удалить
тестовый лот, создать buyer и заблокировать его organization.

## 8. RLS test

Откройте `supabase/rls-tests.sql`, замените UUID placeholders и выполните блоки
в тестовом проекте. Buyer writes должны быть запрещены/затронуть ноль строк,
admin CRUD должен пройти, blocked reads должны вернуть ноль строк.

## Troubleshooting

- Developer-facing config message: `assets/js/config.js` не заполнен.
- `401`: session отсутствует/истёк или JWT verification function не прошла.
- `403`: profile не admin, organization inactive/blocked или RLS отклонила call.
- Edge CORS: `SITE_URL` должен точно совпадать с production origin.
