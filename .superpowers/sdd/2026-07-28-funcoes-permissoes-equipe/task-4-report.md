# Task 4 Report: Login, sessão atual e troca obrigatória de senha

## Status

Complete.

## Files changed

- `huios-api/src/controllers/authController.ts`
- `huios-api/src/middlewares/auth.ts`
- `huios-api/src/controllers/authController.test.ts`
- `huios-admin/src/app/api/auth/change-password/route.ts`
- `huios-admin/src/app/trocar-senha/page.tsx`
- `huios-admin/src/middleware.ts`

## Implementation

- Normalized login email before lookup and kept invalid credentials generic.
- Selected only the password data needed for verification plus the current student and active administrative contexts.
- Returned `isStudent`, `isAdmin`, `mustChangePassword`, a nullable `adminRole`, and the legacy-compatible `role` label without returning password data.
- Limited new login tokens to identity (`id`, `email`) plus the signed `mustChangePassword` navigation hint. Role and permission claims are not issued or trusted.
- Changed Express authentication to verify the token and then re-read active state, student/team links, administrative role status, and current permission keys on every protected request.
- Preserved `req.user.id` and attached the database-derived current access object used by portal and future authorization middleware.
- Allowed `/api/auth/me` while password change is pending and rejected other protected Express routes with `403` and `PASSWORD_CHANGE_REQUIRED`.
- Expanded `/api/auth/me` with both contexts, current permissions, team-member identity, and the existing transformed student enrollment contract.
- Added the admin password-change handler with current-session/user revalidation, safe field-specific validation, bcrypt cost 12 through the existing `hashPassword` helper, and an atomic user update of the hash plus `mustChangePassword: false`.
- Refreshed the signed cookie after a successful password change so the obsolete routing hint cannot loop back to the password screen. The renewed token carries `id` and the legacy-compatible identity alias `userId`, but no authority claims.
- Added the client password-change form and redirected to `/` for an active admin context or `/portal` otherwise.
- Removed mutually exclusive `ALUNO`/admin redirects from Next middleware, retained public routes, and added the signed temporary-password navigation gate.

## TDD evidence

The expanded API suite was written before the implementation. The RED run completed with 5 expected failures out of 10 tests:

- dual-context login fields and normalized lookup were missing;
- legacy token role/permissions were still trusted;
- a user deactivated after token issuance was not rejected;
- pending password change did not block protected portal operations;
- `/api/auth/me` did not return the current dual context.

After implementation, the same suite passed all 10 tests.

## Verification

| Command | Result |
| --- | --- |
| `cd huios-api; npm.cmd test -- src/controllers/authController.test.ts` | PASS — 1 file, 10 tests |
| `cd huios-api; npm.cmd run build` | PASS — TypeScript exit 0 |
| `cd huios-admin; node_modules/.bin/eslint.cmd src/app/api/auth/change-password/route.ts src/app/trocar-senha/page.tsx src/middleware.ts` | PASS — exit 0 |
| `git diff --check` (task files) | PASS |
| `cd huios-admin; node_modules/.bin/tsc.cmd --noEmit` | BLOCKED by pre-existing `src/lib/attendanceStatus.test.mts:7` TS5097 (`.ts` import without `allowImportingTsExtensions`) |

## Self-review

- No password, hash, token, or request body is returned or explicitly logged.
- Inactive users and inactive administrative roles immediately lose their corresponding access.
- The middleware derives authority only from the current database record.
- The password-change cookie refresh contains no role or permissions.
- Changes are limited to the six assigned task files and this report; concurrent catalog/seed and documentation changes were not modified.

## Concerns

- The full admin TypeScript check remains blocked by the unrelated existing TS5097 error in `src/lib/attendanceStatus.test.mts`. Focused lint for all Task 4 admin files passes.

## Fix round 1

### Findings addressed

- Added the current legacy-compatible `role` claim to Express, student-login, and refreshed password-change tokens strictly as a routing/transition hint. Permission claims remain absent, and Express authorization continues to ignore token role in favor of the current database record.
- Closed the student-login bypass by signing both `mustChangePassword` and the current role hint and by using the student relation, rather than the mutually exclusive legacy `ALUNO` role, to admit portal login.
- Made ordinary Next sessions definitive: `getSession()` now re-reads `active` and `mustChangePassword` and denies protected handlers when the current database state is inactive or still requires password change. Identity/session and password-change handlers explicitly use `getIdentitySession()` so they remain available.
- Added current-session policy coverage and student-session token coverage, including the dual-context role hint and absence of permission authority claims.
- Removed the known JWT fallback outside `development` and `test`. Missing or repository-known fallback secrets now fail closed in other environments in both API and admin auth paths.
- Normalized trailing slashes before the Express `/api/auth/me` password-change exception.
- Removed the unused `CurrentAccess` declaration.
- Updated the portal controller authentication fixture to mirror the complete current-user access record required by database revalidation.

### Verification obtained

| Command | Result |
| --- | --- |
| `cd huios-api; npm.cmd test -- src/controllers/authController.test.ts src/controllers/portalController.test.ts` | PASS — 2 files, 57 tests |
| `cd huios-api; npm.cmd run build` | PASS — TypeScript exit 0 |
| `cd huios-admin; tsx --test src/lib/permissions/server.test.ts src/lib/auth.test.ts src/app/api/auth/aluno/login/route.test.ts` | PASS — 11 tests |
| `cd huios-admin; tsc --noEmit` | Reported the new test's read-only `NODE_ENV` assignment and the pre-existing TS5097; the assignment was removed afterward, but the command was not rerun |

### Remaining verification note

- The final focused admin lint rerun was interrupted after its only reported issue (`no-explicit-any` in the touched student identity route) had been removed. No lint pass is claimed for this fix round.
