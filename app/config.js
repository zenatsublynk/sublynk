// Sublynk Console — public Supabase config.
// The anon key is PUBLIC by design (safe to ship in a static site) BECAUSE row-level security
// blocks every table from unauthenticated reads. Nothing here is a secret. The service_role /
// secret keys are intentionally NOT in this file and must never be.
window.SUBLYNK = {
  SUPABASE_URL: "https://nbxipqbrniyottpnjpaa.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieGlwcWJybml5b3R0cG5qcGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjMwNjUsImV4cCI6MjA5ODU5OTA2NX0.PjGJtcTbsu51Z-9hayKgBp9gcIzUA_l0OXSgZnvTgVo"
};
