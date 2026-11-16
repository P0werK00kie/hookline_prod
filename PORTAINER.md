# Deploying on Portainer (self-hosted Appwrite)

The stack in [`docker-compose.yml`](docker-compose.yml) runs the whole app on one Docker host:

| Port   | Service            | What it is                                                      |
| ------ | ------------------ | --------------------------------------------------------------- |
| `7070` | `web`              | The React app (nginx)                                           |
| `7071` | `appwrite-gateway` | Appwrite API (`/v1`), realtime (`/v1/realtime`) and the console |
| —      | `hookline-api`     | Roles, Writers Block connections, schema setup (reached at `7070/api`) |

Behind the gateway sit Appwrite **1.4.13** and its workers, plus MariaDB, Redis,
InfluxDB and Telegraf. Appwrite is pinned to 1.4.x because the app uses the
`appwrite` JS SDK v13 (`account.createEmailSession`), which newer servers removed.

Compared with Appwrite's official 1.4.13 compose, this stack:

- uses a small nginx gateway instead of Traefik, so nothing needs the Docker socket
- leaves out Functions (executor, builds and functions workers) and the AI assistant, which this app doesn't use

---

## 1. Generate secrets

Run this once and keep the output somewhere safe (a password manager).
**Never change `APPWRITE_OPENSSL_KEY` after the first start**, because it encrypts data at rest.

```bash
echo "APPWRITE_OPENSSL_KEY=$(openssl rand -hex 32)"; echo "APPWRITE_DB_PASS=$(openssl rand -hex 16)"; echo "APPWRITE_DB_ROOT_PASS=$(openssl rand -hex 16)"
```

## 2. Create the stack in Portainer

1. **Stacks → Add stack → Repository**
   - Repository URL: `https://github.com/P0werK00kie/hookline_prod`, with credentials if the repo is private
   - Reference: `refs/heads/main` (or `refs/heads/dev`)
   - Compose path: `docker-compose.yml`
2. **Environment variables → Load variables from .env file**: upload a filled-in copy of
   [`stack.env.example`](stack.env.example), or add the variables by hand:
   - `APP_HOST`: the LAN IP or hostname browsers use to reach this Docker host, for example `192.168.1.50`
   - the three secrets from step 1
   - the six `APPWRITE_*_ID` values: copy them from your existing `.env.local`
     (`VITE_APPWRITE_PROJECT_ID`, …). The migration keeps every Cloud ID, so the same values work locally.
3. **Deploy the stack.** Portainer builds the `web` and `appwrite-gateway` images from the repo.
   The first deploy takes a few minutes while images are pulled.

> Repository stacks are required because `web` and `appwrite-gateway` are built from
> this repo. To use the Web editor instead, build and push both images to a registry
> first, then remove the `build:` blocks.

## 3. Set up the local Appwrite project

1. Open `http://APP_HOST:7071/console` and **sign up**. Only the first sign-up is
   allowed (`APPWRITE_CONSOLE_WHITELIST_ROOT=enabled`), and that account becomes the admin.
2. Create an organization, then **Create project**. Click **Project ID → Edit** and
   enter **the same project ID as on Appwrite Cloud**.
3. **Add a platform → Web App**, hostname = `APP_HOST` (no port and no `http://`).
   Without this, the browser gets CORS errors.
4. **Overview → API keys → Create API key** with these scopes: `users`, `databases`,
   `collections`, `attributes`, `indexes`, `documents`, `buckets`, `files` (read and write for each).
   The migration (step 4) uses this key.
5. Create a **second API key** named `hookline-api` with read and write for `users`,
   `databases`, `collections`, `attributes`, `indexes` and `documents`. In Portainer, set
   it as `HOOKLINE_API_KEY`, set `ADMIN_EMAILS` to your own email, and **update the
   stack**. On start, `hookline-api` creates the For Writers collections and seeds the
   guide. Check `http://APP_HOST:7070/api/health`; it reports `"ok":true` when it's ready.

## 4. Copy the data from Appwrite Cloud

Run this from any machine that can reach both Appwrite Cloud and `APP_HOST:7071`
(for example your dev Mac), in a checkout of this repo:

```bash
npm install
```

```bash
cp .env.migrate.example .env.migrate
```

Fill in `.env.migrate`:

- **Source**: your Cloud endpoint and project ID, plus a Cloud API key with the
  `*.read` scopes listed in the file
- **Target**: `http://APP_HOST:7071/v1` and the local API key from step 3

Then run:

```bash
npm run migrate
```

The script ([`scripts/migrate-from-cloud.ts`](scripts/migrate-from-cloud.ts)) copies:

- **Users**, with their password hashes, so everyone keeps their password. It also copies
  prefs, labels, verification flags and disabled status.
- **Databases, collections, attributes, relationships and indexes**, including the fulltext
  index that Explore search needs
- **Documents** with their permissions. Image and avatar URLs that pointed at Cloud are
  rewritten to `TARGET_PUBLIC_ENDPOINT`.
- **Storage buckets and files** with their permissions

It's safe to re-run: anything that already exists is skipped, so if it stops part-way,
just run it again. It does **not** copy sessions (users sign in again), platforms, API
keys, teams or functions.

Appwrite 1.4 can't import `$createdAt` and `$updatedAt` values. The script inserts and
updates documents in their original order, so feeds keep the same order, but the
timestamps show the migration time.

When it's done, delete `.env.migrate`, since it holds API keys.

## 5. Use it

Open `http://APP_HOST:7070` and sign in with an existing account.

---

## Roles

Roles are Appwrite **user labels**: `admin`, `writer` and `singer`. Appwrite enforces them
through collection permissions, so hiding a page isn't the only protection.

- New users choose **I'm a Writer** or **I'm a Singer** when they sign up. A signed-in
  user can also become a Writer from the Writers Block "Writers only" page.
- Anyone listed in `ADMIN_EMAILS` becomes an Admin the next time they sign in.
- Admins manage everyone's roles at **Admin → Users & roles** (`/admin/users`), and can
  edit Guild Me Through It chapters and every listing and resource in place.
- Users can't give themselves `admin`; only the API (with its server key) sets labels.

Sign-up writes the user's profile document before the user is signed in, so the
`users` collection must give **Create** to **Any**. Projects migrated from Cloud already
do, because that's how sign-up works there.

## Operations

**Changing host, ports or IDs.** The front end reads its Appwrite settings when the
container starts (`/env-config.js`), so edit the stack variables and redeploy. No rebuild is needed.

**Updating the app.** Push to the branch, then in Portainer open the stack →
**Pull and redeploy** (tick *Re-pull image* if offered).

**Backups.** Everything lives in named volumes. The two that matter are:

- `…_appwrite-mariadb`: all Appwrite data (users, documents, projects)
- `…_appwrite-uploads`: uploaded files

To take a logical database dump:

```bash
docker exec $(docker ps -qf name=mariadb) sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction appwrite' > appwrite-$(date +%F).sql
```

**Email.** Without SMTP, password-reset and verification emails aren't sent. Set the
`APPWRITE_SMTP_*` variables to enable them.

**Known first-boot log line.** On the very first start, `appwrite-worker-deletes` may log
`Collection "cache" not found` once, before the API finishes creating its tables. It's harmless.

## Troubleshooting

| Symptom                                                           | Fix                                                                                                       |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Browser console shows CORS / "Invalid Origin"                     | Add a Web platform with hostname = `APP_HOST` (step 3.3)                                                  |
| "Project with the requested ID could not be found"                | The local project ID doesn't match `APPWRITE_PROJECT_ID`                                                  |
| Stack won't deploy: `required variable … is missing a value`      | Set that variable in the stack's environment variables                                                    |
| Can't sign up in the console                                      | Only the first account may sign up. Add emails to `APPWRITE_CONSOLE_WHITELIST_EMAILS` or set the whitelist to `disabled` |
| Images 404 after migrating                                        | `TARGET_PUBLIC_ENDPOINT` didn't match what browsers use. Fix it and re-run `npm run migrate`              |
