# AGROMAL

Закрытый B2B MVP для оптовых партий скота: публичная страница, Supabase Auth,
защищённая витрина лотов и небольшая административная панель.

## Что реализовано

- premium static shell без frontend-фреймворка и внешних UI-зависимостей;
- вход по ИНН, преобразуемому в технический Supabase Auth email;
- refresh-safe session в `sessionStorage` и серверная проверка пользователя;
- роли `buyer` / `admin`, статусы организаций и принудительный отказ blocked users;
- лоты из Supabase PostgreSQL, desktop table и mobile cards;
- создание, изменение и удаление лотов администратором;
- создание Auth-пользователей и блокировка организаций через Edge Function;
- PostgreSQL RLS как реальная граница доступа;
- RU/KY/EN, доступные состояния ошибок, reduced motion;
- WhatsApp verification, moderation и предложение по конкретному лоту;
- CSP/security headers, SEO, sitemap, robots и 404.

## Stack

HTML5, CSS3, ES modules, Supabase Auth, PostgREST, PostgreSQL, RLS и одна
Supabase Edge Function. Runtime npm-зависимостей нет.

## Структура

```text
assets/css/                 дизайн-система и адаптивные компоненты
assets/js/                  config, i18n, auth, API и page controllers
supabase/schema.sql         таблицы, constraints и access-context RPC
supabase/policies.sql       RLS helper functions и policies
supabase/seed.sql           явно помеченные DEMO-лоты
supabase/rls-tests.sql      ручная проверка buyer/admin/blocked policies
supabase/functions/         privileged Auth user management
index.html                  public + real login
dashboard.html              protected buyer workspace
admin.html                  protected admin workspace
```

## Локальный запуск

Страницы необходимо открывать через HTTP, а не `file://`:

```bash
python -m http.server 8000
```

Затем открыть `http://localhost:8000`. Перед этим выполнить настройку из
[`README_SETUP.md`](README_SETUP.md).

## Проверка

```bash
npm test
```

Статический аудит проверяет обязательные файлы, local links, duplicate IDs,
синтаксис browser JS, отсутствие auth state в `localStorage`, debug artifacts,
frontend service-role key и наличие RLS для всех таблиц.

Полный Auth/RLS/CRUD smoke test требует настроенного Supabase-проекта и двух
локальных demo accounts. Сценарии описаны в [`README_SETUP.md`](README_SETUP.md).

## Security notes

- В браузере допустим только Supabase anon key. Он не является секретом.
- Supabase service-role credential существует только в secrets Edge Function.
- Пароли проверяет Supabase Auth; AGROMAL не хранит их в своих таблицах.
- Язык хранится в `localStorage`; auth session — только в `sessionStorage`.
- UI role checks улучшают UX, но права обеспечиваются PostgreSQL RLS.
- Blocked organization не видит ни лоты, ни profiles/organizations. После
  проверки access context frontend также очищает session.
- CSP разрешает только local assets и HTTPS-соединения с Supabase.
- HSTS из `_headers` применим только после production HTTPS deployment.

## Known MVP limitations

- создание пользователя поддерживает одну новую организацию на пользователя;
- восстановление/смена пароля выполняется через Supabase Dashboard;
- юридические документы обозначены как находящиеся в подготовке, без битых ссылок;
- интеграции с Түндүк, СИОЖ, ЭТТН, платежи и realtime bidding не реализованы и
  не заявляются как действующие;
- blocking немедленно закрывает данные через RLS; глобальный отзыв всех Auth
  refresh tokens можно добавить отдельным server-side workflow после MVP.

## Deployment

См. [`README_DEPLOY.md`](README_DEPLOY.md). Production target: `https://agromal.kg`.
