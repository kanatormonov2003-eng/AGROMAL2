// Copy to config.js for local use, or generate config.js at deploy time.
// The Supabase anon key is public by design. Never put privileged server credentials here.
window.AGROMAL_CONFIG = Object.freeze({
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  whatsappVerification: "996XXXXXXXXX",
  whatsappModeration: "996XXXXXXXXX",
  bookingAppsScriptUrl: "https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec",
  siteUrl: "https://agromal.kg"
});
