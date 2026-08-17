# Running the PHP backend locally (against the remote Hostinger DB)

Your frontend currently calls the **deployed** API at `https://test.ecosudar.com/api`.
To instead run the backend on your own machine against the remote DB, do the following.

## What's already configured
- `.env` (repo root) → `DB_HOST=srv1873.hstgr.io`, `DB_NAME=u952547820_test`,
  `DB_USER=u952547820_test`, `DB_PASS=…`, `DB_PORT=3306`. The backend reads these.
- `api/config/database.php` already loads `.env`; `api/core/Database.php` already builds
  the PDO DSN **with the port**. No code changes were needed.
- `.env` is now untracked from git and gitignored. `.env.example` is the safe template.
- Hostinger **Remote MySQL** must allow your IP (you confirmed this is done).

## Prerequisite: install PHP (not currently installed)
Install PHP 8.1+ (e.g. XAMPP, or the standalone PHP for Windows). Confirm:
```
php --version
```

## 1. Test the DB connection (no file left behind)
From the repo root, run this single command:
```
php -r "require 'api/config/database.php'; try { $p = new PDO('mysql:host='.DB_HOST.';port='.DB_PORT.';dbname='.DB_NAME.';charset='.DB_CHARSET, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); echo 'OK connected to '.DB_HOST.'/'.DB_NAME.PHP_EOL; } catch (Throwable $e) { echo 'FAIL: '.$e->getMessage().PHP_EOL; }"
```
- `OK connected to …` → the remote DB is reachable from your machine.
- `FAIL: …2002…` / timeout → Remote MySQL not allowing your IP, or wrong host.
- `FAIL: …1045 Access denied…` → wrong DB user/password.

## 2. Serve the API locally
```
php -S localhost:8081 -t api
```
This serves the `api/` folder at `http://localhost:8081`.

## 3. Point the frontend at your local API
In `eco-sudar-control/.env`, change:
```
VITE_API_BASE_URL="http://localhost:8081"
```
(Currently it's `https://test.ecosudar.com/api`.) Restart `npm run dev`.
Revert this line when you want the frontend to talk to the live server again.

## 4. Log in
The admin password in the DB must be one you know. If login still says
"Invalid credentials", set it directly in phpMyAdmin (or via the connected DB):
```sql
SELECT user_id, email, user_type, is_active, approval_status FROM users WHERE email='admin@ecosudar.com';
```
Then, if needed, set a known bcrypt(cost 12) password hash for that row.

## Deploy safety
- Do **NOT** upload your local `.env` to the server — the server keeps its own `.env`
  with `DB_HOST=localhost`. There is no deploy.sh, so deploys here are manual; just
  exclude `.env` when uploading.
- Because secrets were previously committed to git history, rotate `DB_PASS`,
  `JWT_SECRET`, and the AI keys when convenient.
