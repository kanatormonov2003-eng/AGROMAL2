# Architecture decisions

- Vanilla static client retained because no framework/runtime existed and MVP
  does not need one.
- Supabase Auth email is deterministically derived as `inn.<digits>@login.agromal.kg`.
  The password is still verified only by Supabase and is never stored in app data.
- Browser session uses `sessionStorage`, then validates JWT and access context on
  every protected page load. Language preference alone uses `localStorage`.
- PostgreSQL RLS is the authorization boundary. `private.is_admin()` and
  `private.has_active_access()` are security-definer helpers with empty search path.
- Auth user administration requires a service role, so it is isolated in one
  authenticated Edge Function. The browser only sends its normal user JWT.
- Government integrations, transaction statistics, prices and automated
  documents are intentionally absent to avoid unsupported claims.
