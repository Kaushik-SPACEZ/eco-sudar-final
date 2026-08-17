Sensitive files committed to git — Three files containing real credentials are tracked in the repo:

File	What's exposed
api/config/database.php	DB password: Ecosudar@4321
docs/auth/credential.txt	Admin login: admin@ecosudar.com / EcoSudar@2024
eco-sudar-control/.env	Supabase project key & URL
Anyone with repo access can see your production database password and admin credentials. These should be removed from git history and added to .gitignore.

CORS set to * in production — api/config/app.php:20 has define('CORS_ORIGIN', '*'). This allows any website to call your API. Should be restricted to your actual domains.

JWT secret in committed config — The JWT secret in api/config/app.php is committed. If the repo is ever made public, all tokens can be forged.


Issue	Status
RateLimitMiddleware was defined but never loaded in index.php	✅ Fixed — added require_once
RateLimitMiddleware::handle() was never called in the Router	✅ Fixed — added to Router::dispatch()
POST /auth/login had no rate limit	✅ Fixed — now 5 attempts / 15 min
POST /auth/register had no rate limit	✅ Fixed — now 3 attempts / 60 min
POST /auth/forgot-password had no rate limit	✅ Fixed — now 5 attempts / 15 min
Final Rate Limit Summary
Endpoint	Limit
All endpoints (global)	100 req / 60 sec per IP
POST /auth/login	5 attempts / 15 min per IP
POST /auth/register	3 attempts / 60 min per IP
POST /auth/forgot-password	5 attempts / 15 min per IP
POST /auth/verify-otp	3 wrong attempts per OTP (DB-enforced)



CORS_ORIGIN=https://api.ecosudar.com,http://localhost:8080,http://localhost:8081
