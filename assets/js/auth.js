import { getUser, isConfigured, rpc, signOut } from "./supabase.js";

export async function requireAccess(requiredRole = null) {
  if (!isConfigured()) return { ok: false, reason: "configuration" };
  const user = await getUser();
  if (!user) return { ok: false, reason: "unauthorized" };
  try {
    const rows = await rpc("current_access_context");
    const access = Array.isArray(rows) ? rows[0] : rows;
    if (!access || access.organization_status !== "active") {
      await signOut();
      return { ok: false, reason: access?.organization_status === "blocked" ? "blocked" : "forbidden" };
    }
    if (requiredRole && access.role !== requiredRole) {
      return { ok: false, reason: "forbidden", access };
    }
    return { ok: true, user, access };
  } catch (error) {
    if (error.status === 401 || error.status === 403) await signOut();
    return { ok: false, reason: error.status === 403 ? "forbidden" : "network", error };
  }
}

export function redirectForAccess(result, loginPath = "./index.html") {
  if (result.ok) return false;
  const params = new URLSearchParams();
  if (result.reason === "blocked") params.set("auth", "blocked");
  else if (result.reason === "forbidden") params.set("auth", "forbidden");
  else if (result.reason === "configuration") params.set("auth", "configuration");
  else params.set("auth", "expired");
  window.location.replace(`${loginPath}?${params.toString()}`);
  return true;
}
