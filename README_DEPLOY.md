# Deployment

## Static hosting

Разместите корень репозитория на static host с HTTPS и поддержкой custom headers
(Netlify совместим с `_headers`; для другого host перенесите правила вручную).
Entry point — `index.html`, custom 404 — `404.html`.

До deployment заполните/сгенерируйте `assets/js/config.js`. Не добавляйте туда
`service_role`, пароли или другие secrets.

## Required headers

`_headers` настраивает CSP, clickjacking/MIME/referrer protections, permissions
policy, HSTS и `no-store` для защищённых HTML/config. HSTS следует включать
только на HTTPS production domain. Если host игнорирует `_headers`, перенесите
значения в его native config до запуска.

CSP разрешает `connect-src` только с текущего origin и `https://*.supabase.co`.
Если Supabase использует custom domain, замените источник точным доменом.

## Supabase

- применить schema → policies → seed;
- deploy `manage-user` Edge Function;
- установить Function secret `SITE_URL=https://agromal.kg`;
- создать bootstrap admin по `README_SETUP.md`;
- не отключать RLS и не раздавать anon table grants шире SQL из репозитория.

## Preflight

```bash
npm test
```

Затем пройти Auth, Buyer, Admin и RLS checklists из `README_SETUP.md` на staging.
Проверить browser console/network: local assets без 404, Supabase calls без
unexpected 4xx/5xx, CSP без blocked required resources.

## DNS and SEO

Production canonical origin — `https://agromal.kg`. После подключения домена
проверить `robots.txt`, `sitemap.xml`, OG image и canonical URL. Dashboard/admin
не индексируются.
