import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("AGROMAL_SERVICE_KEY") ?? "";
const allowedOrigins = new Set([
  Deno.env.get("SITE_URL") ?? "https://agromal.kg",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);

function headers(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://agromal.kg",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin"
  };
}
function response(request: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: headers(request) });
}
function validText(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(request) });
  if (request.method !== "POST") return response(request, 405, { message: "Method not allowed" });
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || !supabaseUrl || !serviceRoleKey) return response(request, 401, { message: "Unauthorized" });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return response(request, 401, { message: "Unauthorized" });
  const { data: caller } = await admin.from("profiles").select("role, organization_id, organizations!inner(status)").eq("id", userData.user.id).single();
  const callerOrganization = Array.isArray(caller?.organizations) ? caller.organizations[0] : caller?.organizations;
  if (!caller || caller.role !== "admin" || callerOrganization?.status !== "active") return response(request, 403, { message: "Forbidden" });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return response(request, 400, { message: "Invalid JSON" }); }

  if (body.action === "create") {
    const inn = String(body.inn ?? "").replace(/\D/g, "");
    const role = body.role === "admin" || body.role === "buyer" ? body.role : null;
    if (!role || !/^\d{8,14}$/.test(inn) || !validText(body.company_name, 2, 160) || !validText(body.full_name, 2, 160) || !validText(body.password, 12, 128)) {
      return response(request, 400, { message: "Invalid user data" });
    }
    const email = `inn.${inn}@login.agromal.kg`;
    const { data: created, error: authError } = await admin.auth.admin.createUser({ email, password: String(body.password), email_confirm: true });
    if (authError || !created.user) return response(request, 400, { message: authError?.message ?? "Could not create user" });

    const { data: organizationId, error: profileError } = await admin.rpc("create_managed_user_profile", {
      p_user_id: created.user.id, p_company_name: body.company_name.trim(), p_inn: inn,
      p_full_name: body.full_name.trim(), p_login_email: email, p_role: role
    });
    if (profileError || !organizationId) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(created.user.id);
      return response(request, cleanupError ? 500 : 409, { message: cleanupError ? "User cleanup required" : "Organization or TIN already exists", code: cleanupError ? "CLEANUP_REQUIRED" : "DUPLICATE_ORGANIZATION" });
    }
    return response(request, 201, { id: created.user.id, organization_id: organizationId, login: email });
  }

  if (body.action === "set_status") {
    const status = body.status === "blocked" ? "blocked" : body.status === "active" ? "active" : null;
    const organizationId = String(body.organization_id ?? "");
    if (!status || !/^[0-9a-f-]{36}$/i.test(organizationId)) return response(request, 400, { message: "Invalid status request", code: "INVALID_STATUS" });
    const { data: updatedId, error } = await admin.rpc("set_managed_organization_status", {
      p_caller_id: userData.user.id, p_organization_id: organizationId, p_status: status
    });
    if (error || !updatedId) {
      const knownCode = ["SELF_BLOCK_FORBIDDEN", "LAST_ADMIN_REQUIRED", "ORGANIZATION_NOT_FOUND"].find((code) => error?.message?.includes(code));
      return response(request, knownCode === "ORGANIZATION_NOT_FOUND" ? 404 : 409, { message: knownCode ?? "Could not update organization", code: knownCode ?? "STATUS_UPDATE_FAILED" });
    }
    return response(request, 200, { organization_id: updatedId, status });
  }

  return response(request, 400, { message: "Unknown action" });
});
