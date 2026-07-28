# Task 1 report: RBAC persistence and migration

## Files changed

- `huios-admin/prisma/schema.prisma`
- `huios-api/prisma/schema.prisma`
- `huios-admin/prisma/migrations/20260728170000_add_rbac_team_access/migration.sql`
- `.superpowers/sdd/2026-07-28-funcoes-permissoes-equipe/task-1-report.md`

## Decisions

- Added identical `Role`, `Permission`, `RolePermission`, and `AuditLog` models to the admin and API Prisma schemas.
- Added the nullable, unique `TeamMember.userId` relation, `TeamMember.active`, `User.adminRoleId`, `User.adminRole`, `User.mustChangePassword`, and the `AuditActor` audit relation without changing the legacy `User.role` column.
- Used cascade deletion for the two `RolePermission` foreign keys and `SET NULL` for audit actor, team member user, and administrative role references.
- The migration uses fixed UUID values for the six initial roles, avoiding a dependency on a PostgreSQL UUID extension. `SUPER_ADMIN` is seeded as protected.
- Legacy roles are copied to `adminRoleId` by case-insensitive role key; `ALUNO` receives no administrative role. Team-member links are created only when the case-insensitive email match is unique for both the user and team member.
- No permissions are seeded, so access remains deny-by-default until permissions are explicitly granted.

## Commands and results

| Command | Result |
| --- | --- |
| `npx prisma validate --schema huios-admin/prisma/schema.prisma` | Blocked before execution by the local PowerShell execution policy for `npx.ps1`. |
| `& 'huios-admin\\node_modules\\.bin\\prisma.cmd' validate --schema 'huios-admin\\prisma\\schema.prisma'` | Passed: schema is valid. |
| `& 'huios-api\\node_modules\\.bin\\prisma.cmd' validate --schema 'huios-api\\prisma\\schema.prisma'` | Passed: schema is valid. |
| `& 'huios-admin\\node_modules\\.bin\\prisma.cmd' generate --schema 'huios-admin\\prisma\\schema.prisma'` | Passed: Prisma Client 6.19.2 generated successfully. |
| `npx prisma generate --schema huios-api/prisma/schema.prisma` | Not run: coordinator instructed no further Prisma retries after the bounded validation/generation attempts. |
| `git diff --check` | Passed: no whitespace errors. |
| Prisma-model parity check for `Role`, `Permission`, `RolePermission`, and `AuditLog` | Passed: all four model definitions are identical in both schemas. |

## Self-review

- Confirmed every required model field, default, relation, composite primary key, and audit deletion behavior is represented in both schemas.
- Confirmed the migration creates the tables, indexes, and foreign keys; adds new existing-data columns safely; seeds all six requested role keys; protects `SUPER_ADMIN`; migrates legacy roles; and conditionally links team members.
- Confirmed the migration does not delete or alter the legacy `User.role` column.
- Confirmed no password, password hash, or token is inserted into `AuditLog` by this persistence migration.

## Commit

`2b385b1` — `feat: add rbac data model`

## Concerns

- The literal `npx` commands cannot execute in this environment because PowerShell blocks `npx.ps1`; equivalent package-local `.cmd` Prisma commands were used for the completed checks.
- API Prisma client generation was not run because coordination explicitly stopped further Prisma retries after the bounded attempt window. The API schema itself validated successfully.

## Round 1 fixes

- Fixed the fresh-deploy migration-history mismatch: the migration now renames legacy `Monitor` to `TeamMember` only when `TeamMember` is absent, then adds the legacy-missing `role` column. Databases already upgraded to `TeamMember` are left unchanged.
- Added the explicit `TeamMemberCourseClass` assignment join model and table. It has a composite primary key, active flag, timestamps, cascade foreign keys, and named relations so scope resolution can traverse `User -> TeamMember -> courseClassAssignments`.
- Kept the RBAC models and the new assignment model textually identical across the admin and API schemas.

## Round 1 commands and results

| Command | Result |
| --- | --- |
| `& 'huios-admin\\node_modules\\.bin\\prisma.cmd' validate --schema 'huios-admin\\prisma\\schema.prisma'` | Passed: `The schema at huios-admin\\prisma\\schema.prisma is valid`; `EXIT=0`. |
| `& 'huios-api\\node_modules\\.bin\\prisma.cmd' validate --schema 'huios-api\\prisma\\schema.prisma'` | Passed: `The schema at huios-api\\prisma\\schema.prisma is valid`; `EXIT=0`. |
| `& 'huios-admin\\node_modules\\.bin\\prisma.cmd' generate --schema 'huios-admin\\prisma\\schema.prisma'` | Passed: Prisma Client 6.19.2 generated in 3.15s; `EXIT=0`. |
| `& 'huios-api\\node_modules\\.bin\\prisma.cmd' generate --schema 'huios-api\\prisma\\schema.prisma'` | Passed: Prisma Client 6.19.2 generated in 2.56s; `EXIT=0`. |
| `git diff --check` | Passed: no whitespace errors. |
| RBAC and assignment model parity check | Passed: `Role`, `Permission`, `RolePermission`, `AuditLog`, and `TeamMemberCourseClass` are identical. |
