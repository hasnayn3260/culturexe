# CultureXe Platform Architecture and Roadmap

Last updated: 23 November 2026

## Purpose

This is the living source of truth for the CultureXe platform architecture and implementation sequence. Update it whenever a decision changes or a related task is completed.

The immediate objective is to evolve the existing DBN-focused application into a secure multi-organisation, multi-survey platform without mixing client data or rebuilding the application as one large monolith.

## Agreed technical direction

- Supabase remains the database and authentication provider.
- Vercel remains the frontend hosting platform.
- Postmark is the transactional email provider.
- New backend functionality should use TypeScript.
- New frontend functionality should use TSX where practical.
- Shared UI components should use shadcn components while preserving the existing CultureXe styling.
- Business logic belongs in backend modules or Supabase Edge Functions, not directly in UI components.
- Email presentation belongs in Postmark templates; recipient selection, authorisation, links, delivery logging and retry logic belong in the backend.

## Current implementation state

### Organisation scoping

- `organisations` exists.
- `profiles.org_id` links a user profile to an organisation.
- `survey.org_id` is required and links every survey to an organisation.
- The DBN survey has been assigned to the DBN organisation.
- `useSurvey(orgId)` currently scopes survey loading to an organisation.
- `useClientSurvey(..., orgId)` currently scopes client survey loading to an organisation.
- Response metrics now compare responses with respondents belonging to the selected survey.

### Current limitation

`useSurvey(orgId)` selects only the newest survey for an organisation. The schema supports multiple surveys, but the application does not yet provide a proper survey list or selected-survey context.

### Completed corrective work

- CXW-9: response counts now use actual respondents and unique submitted responses instead of a hard-coded expected total.
- CXW-15: effective survey status now uses `live_start` and `live_end`; an expired survey is displayed as closed and submission routes reject late responses.
- Survey launching is blocked when the closing date is already in the past.
- Manual survey stopping now explains that it closes the survey immediately and replaces the scheduled closing time.

The existing expired DB record may still contain `status = 'live'`. The frontend treats it as closed, but the database should also be corrected once with:

```sql
update public.survey
set status = 'closed'
where status = 'live'
  and live_end is not null
  and live_end <= now();
```

## Target roles

### Super administrator

- Access all organisations.
- Create, update and deactivate organisations.
- Manage consultants, organisation owners and employees.
- Create, edit, launch, stop and analyse surveys.
- Select an active organisation globally.

### Consultant

- Access only organisations assigned to the consultant.
- Manage users and surveys for assigned organisations.
- View identifiable participation data where authorised.
- Create, edit, launch, stop and analyse surveys.

### Organisation owner

- Locked to their own organisation.
- Read-only access to organisation-level dashboards and analytics.
- No access to participant names or other identifying response data.
- Can read survey questions.
- Can comment on questions but cannot edit them.
- Cannot create or launch surveys under the initial product tier.

### Employee

- Locked to their own organisation.
- Can access only surveys assigned to them.
- Can update only permitted profile fields.
- Cannot access other users, organisation administration or analytics.

## Target data model

```text
organisations
├── organisation_memberships
│   └── profiles
└── surveys
    ├── survey_questions
    │   └── survey_question_comments
    ├── survey_respondents
    │   └── profiles (optional participant link)
    └── survey_responses
```

### Organisation memberships

`profiles.org_id` is suitable for employees and organisation owners who belong to one organisation. It is insufficient for consultants who may work with several organisations.

Add:

```text
organisation_memberships
- id uuid primary key
- profile_id uuid references profiles(id)
- organisation_id uuid references organisations(id)
- role text
- created_at timestamptz
- unique(profile_id, organisation_id)
```

Global super administrators do not need one membership per organisation. Their global role grants access, while consultants receive explicit memberships.

### Survey ownership

`survey.org_id` remains the authoritative organisation relationship.

The following child tables do not require duplicate organisation IDs because the organisation can be derived through the survey:

- `survey_questions.survey_id`
- `survey_respondents.survey_id`
- `survey_responses.survey_id`

RLS policies must validate that relationship through the survey. Add a duplicated `org_id` only if a measured performance or audit requirement justifies it.

### Participant assignment

Add or confirm:

- Keep the existing `survey_respondents.user_id` column and add or confirm its nullable foreign key to `profiles(id)`. Do not add a duplicate `profile_id` column.
- A unique constraint appropriate to the invitation model, normally `(survey_id, email)`.
- Employees discover available surveys through their respondent assignments, not by loading the newest survey in their organisation.

### Question comments

Add:

```text
survey_question_comments
- id uuid primary key
- question_id uuid references survey_questions(id)
- organisation_id uuid references organisations(id)
- author_id uuid references profiles(id)
- comment text
- created_at timestamptz
```

Organisation owners can read and create comments for their organisation but cannot update survey questions.

## Application state and hooks

### Organisation context

Create one organisation context for the authenticated application.

- Super administrators can select any active organisation.
- Consultants can select from assigned organisations.
- Organisation owners and employees are automatically locked to their organisation.
- The selected organisation should persist across navigation and may be stored in the URL or local storage, subject to server-side authorisation.
- Changing the organisation clears any selected survey that does not belong to the new organisation.

### Survey context

Replace the newest-survey assumption with two responsibilities:

```text
useSurveys(organisationId) -> survey list for the organisation
useSurvey(surveyId)        -> selected survey, questions, respondents and responses
```

The selected survey ID should be represented in the route where possible, for example:

```text
/app/organisations/:organisationId/surveys/:surveyId/dashboard
/app/organisations/:organisationId/surveys/:surveyId/builder
/app/organisations/:organisationId/surveys/:surveyId/controls
/app/organisations/:organisationId/surveys/:surveyId/analytics
```

Routes improve refresh behaviour, browser navigation and deep linking. They do not replace database authorisation.

## Consultant navigation

Recommended structure:

```text
Consultant Dashboard
├── Overview
└── Clients

Survey Management
├── Surveys
├── Survey Builder
├── Survey Controls
└── Analytics

Configuration
├── Organisations
└── Users
```

The entire Configuration navigation group is visible to super administrators only. Consultants, organisation owners and employees must not see or access the Organisations or Clients/User Management configuration routes.

### Global organisation selector

The header should contain the active organisation selector. Once selected, the dashboard, surveys, analytics, users and configuration views must all use the same organisation context.

### Surveys view

- List all surveys for the selected organisation.
- Allow authorised global users to filter by all organisations when no organisation is selected.
- Show title, organisation, status, opening date, closing date, response count and actions.
- Selecting a survey opens that survey's dashboard or management view.

### Survey Builder

- Survey details.
- Questions.
- Question ordering.
- CSV question import.
- Organisation owners receive read-only access plus commenting.

### Survey Controls

- Schedule and dates.
- Launch, stop, reopen and close actions.
- Open-link settings.
- Participant invitations.
- Reminder settings and sending history.
- Survey status must use the effective date-aware status rules.

## Organisation and user management

### Organisation management

Authorised users need a table that supports:

- Create organisation.
- Edit organisation.
- Deactivate organisation instead of destructive deletion when related data exists.
- View organisation users and surveys.
- Assign consultants and organisation owners.

Organisation profile fields:

- Company name (`name`).
- Registration number (`registration_number`).
- Industry (`industry`).
- Number of staff (`employee_count`).
- Country (`country`).
- Primary contact name (`contact_name`).
- Primary contact email (`contact_email`).
- Website (`website`).
- Account status (`status`).

The existing `size` field overlaps with `employee_count`. New functionality should use `employee_count` as the authoritative numeric staff count. Do not remove `size` until existing usage and data have been reviewed.

### User import

Large organisations must not require manual user creation.

The import workflow should:

1. Select or create the organisation.
2. Download a CultureXe CSV/XLSX template.
3. Upload the completed file.
4. Validate all rows before creating users.
5. Display row-specific validation errors.
6. Create or update profiles in a backend job or Edge Function.
7. Resolve managers in a second pass using a stable identifier such as manager email.
8. Create survey assignments and unique links only after profile import succeeds.
9. Send invitations in controlled batches.

Expected profile fields include:

- Full name.
- Email.
- Organisation.
- Branch.
- Department, where supplied separately from branch.
- Job title or work role.
- Manager.
- Location or site.
- Hire or start date where available.

The following fields are consultant-managed and read-only for employees:

- Email.
- Full name.
- Branch.
- Manager or person reported to.
- Location or site.
- Job title or work role.

Recommended profile columns:

```text
profiles.email
profiles.full_name
profiles.branch
profiles.department
profiles.manager_id
profiles.location_site
profiles.job_title
```

`profiles.role` remains the CultureXe permission role, such as `super_admin`, `consultant`, `organisation_owner` or `employee`. It must not be reused for the employee's job role. The employee's work role belongs in `job_title` or a separately named `work_role` column.

The import file may contain the manager's name for display, but manager matching should use a stable unique value such as `manager_email`. The backend resolves that email to `profiles.manager_id` after all organisation users have been imported.

Employee read-only behaviour must be enforced in two places:

- The profile interface displays these fields without editable controls.
- Supabase RLS prevents employees from updating these columns directly through the API.

Super administrators and authorised consultants may correct these fields. Organisation owners may receive correction rights later only if that permission is explicitly approved.

Do not expose Supabase service-role credentials in the frontend. Bulk authentication-user creation must run on the backend.

### User management data sources

The super-admin Clients/User Management page combines two data sources:

- Supabase Auth users for UID, authentication email and phone, providers, provider type, account creation time and last sign-in time.
- `public.profiles` for organisation, full name, platform role, active status, department, job title, manager, hire date, username, position, branch and location/site.

Supabase Auth users are not a normal browser-readable public table. A trusted backend function must read and mutate Auth account details with the Supabase Admin API, then return only the fields the super-admin page needs. The frontend must never receive the Supabase secret/service-role key.

Use `profiles.full_name` as the authoritative display name and `profiles.email` as the application copy of the Auth email. Any email update must update Auth and the profile together.

Current role inventory confirmed on 20 November 2026:

- `client`: 146 profiles.
- `superadmin`: 4 profiles.

The first CRUD implementation must preserve these current values. A later versioned migration will map them to the final role vocabulary, such as `employee` and `super_admin`, when the related routing, RLS and permission code are ready.

### Respondent account invitation

Requirement: when a consultant uploads respondent details and assigns the respondent to a survey, the respondent must receive access to the pre-populated profile and the assigned survey.

Recommended flow:

1. The consultant imports the employee record and selects the organisation.
2. A trusted backend function creates or identifies the Supabase Auth user.
3. The backend links `profiles.id` to the Auth user ID and preserves the imported organisation, manager, department, location and job details.
4. The backend creates the `survey_respondents` assignment for the selected survey.
5. For a new account, the trusted backend generates a strong temporary password and creates a confirmed Supabase Auth user.
6. CultureXe sends the username and temporary password through the Postmark `tempaccess` template with link tracking disabled.
7. The account is marked `must_change_password = true` and cannot enter a protected portal until the password is replaced.
8. After password setup, CultureXe clears the temporary-access flag and sends the respondent to the correct portal.
9. For an existing account, CultureXe sends a normal survey invitation linking to the assigned survey.

Temporary passwords are generated only in memory, are never stored or logged, and must be replaced on first login. Account creation is rolled back if the Postmark template cannot be sent.

Proposed email types:

- `tempaccess`: new managed account credentials and required password replacement.
- `survey-invitation`: existing user assigned to a survey.
- `survey-reminder`: assigned respondent has not submitted.
- `survey-completed`: confirmation after successful submission.

Authentication invitation and recovery links must have link tracking disabled so an email-security scanner or tracking redirect does not interfere with the one-time token.

## Email architecture

### Postmark templates

Initial templates:

- `tempaccess`
- `survey`
- `survey-reminder`
- `survey-completed`

Templates own:

- Subject.
- HTML and text content.
- Branding and shared layout.
- Placeholders such as recipient name, organisation, survey title, unique URL and closing date.

### Backend email service

The TypeScript backend owns:

- Authorisation.
- Organisation and survey validation.
- Recipient selection.
- Unique survey links.
- Calling Postmark with the template alias and model.
- Per-message tracking settings.
- Delivery message IDs, errors and retry state.
- Preventing invitations or reminders for closed surveys.

Postmark credentials must be stored as backend secrets. They must never use a `VITE_` environment variable.

### Tracking policy

- Survey invitations and reminders may use link tracking.
- Authentication and password-reset emails should not use link tracking.
- Completion receipts normally do not need link tracking unless they include a meaningful destination.

## Security and RLS

Multi-organisation UI filtering is not a security boundary. Row Level Security must be enabled before exposing data from more than one client.

Required policy outcomes:

- Super administrators can access all permitted platform data.
- Consultants can access only organisations in `organisation_memberships`.
- Organisation owners can access only aggregate and non-identifying data for their organisation.
- Employees can read their own profile, assignments and responses.
- Employees can submit only to an assigned survey that is currently accepting responses.
- Users cannot change their own organisation or role.
- Survey mutations require an authorised consultant or super administrator.
- Question comments require membership in the survey's organisation.

Any browser query must be assumed visible and modifiable by the user. Sensitive enforcement belongs in RLS, database functions or backend functions.

## Database migrations and backups

Schema migrations and database backups solve different problems and both are required.

### Migration history

- Store every future schema change in `supabase/migrations/<timestamp>_<description>.sql`.
- Commit migration files to Git.
- Migrations contain schema changes, constraints, functions, triggers and RLS policies; they are not copies of production data.
- Capture the current remote database as the initial baseline before making more remote SQL Editor changes.
- Preferred project workflow after the baseline: apply an approved change through the Supabase SQL Editor, immediately run `supabase db pull --remote`, register the generated migration as applied, review it and commit it to Git. Never leave a remote SQL Editor change uncaptured.

Current repository state on 20 November 2026:

- `supabase/migrations` does not exist.
- `supabase/schema.sql` is empty and is not a usable backup.
- The earlier CLI dump did not complete because Docker or Podman was unavailable.

Managed backup status confirmed on 20 November 2026:

- Supabase scheduled daily physical backups are active.
- Restore points are visible in the Supabase Dashboard.
- The latest backup observed was 20 November 2026 at 00:46 UTC, which is 02:46 Africa/Johannesburg time.
- Supabase Storage objects are not included in these database backups.

### Backup policy

- Confirm managed backups under Supabase Dashboard, Database, Backups.
- Paid Supabase plans provide managed daily backups according to the plan's retention period; free projects require a separate manual or automated backup process.
- Keep logical schema, roles and data backups in private encrypted storage. Never commit production data backups to the application repository.
- Database backups do not restore deleted Storage API objects; storage files need their own backup policy if CultureXe begins using Supabase Storage.
- Test restoration periodically. A backup is not proven until it can be restored.

## Delivery sequence

## Current implementation priority

The immediate implementation order was revised on 20 November 2026. Build the standalone management structure before adding the full multi-organisation and multi-survey orchestration or wiring the Postmark senders:

1. Standalone Organisation CRUD.
2. Standalone User CRUD.
3. Split Surveys, Survey Builder, Survey Controls and Analytics into standalone tabs and modules.
4. Add organisation memberships, global organisation selection and organisation-scoped permissions.
5. Add multi-survey listing, survey selection, routes and employee survey assignments.
6. Complete role enforcement and RLS before multi-client production access.
7. Implement CXW-7 reminders and CXW-8 completion receipts using the selected organisation and survey IDs.

Even before the selection contexts exist, standalone modules must accept explicit `organisationId` and `surveyId` inputs. Do not hard-code DBN or load the newest survey inside a presentation component. This keeps the base reusable when multi-organisation and multi-survey orchestration is introduced.

The Postmark templates have been created and are ready for the later email integration phase.

### Phase 1 Foundation

- [x] Confirm Supabase managed backup availability and retention.
- [ ] Take a private logical backup of roles, schema and data.
- [x] Capture the current remote schema as the initial migration baseline.
- [ ] Create `organisation_memberships`.
- [ ] Define and migrate role values.
- [ ] Decide which existing users are super administrators, consultants, organisation owners and employees.
- [ ] Add organisation and survey helper functions used by RLS.
- [ ] Enable and test RLS table by table.
- [ ] Add automated cross-organisation access tests.

### Phase 2 Multi-survey application state

- [ ] Add reusable `survey_templates` and `survey_template_questions` tables.
- [ ] Restrict template creation, editing and deletion to super administrators.
- [ ] Allow templates to be global or scoped to one organisation.
- [ ] Clone template content only: description, sections, questions, ordering and answer options; never clone respondents, dates, responses or delivery history.
- [ ] Create `useSurveys(organisationId)`.
- [ ] Change `useSurvey` to load by `surveyId`.
- [ ] Create organisation context.
- [ ] Create survey context or route-based selection.
- [ ] Replace remaining newest-survey assumptions.
- [ ] Load employee surveys through assignments.

### Phase 3 Consultant interface

- [ ] Add the global organisation selector.
- [ ] Add the organisation dashboard or clients view.
- [ ] Add the surveys list.
- [ ] Split survey management into Survey List, Survey Builder, Survey Controls and Survey Settings tabs.
- [ ] Lock questionnaire structure after a survey becomes live; allow lifecycle controls to remain editable.
- [ ] Scope Dashboard and Analytics to the selected survey.
- [ ] Add organisation management.
- [ ] Add user management scoped to the selected organisation.

### Phase 4 Organisation owner interface

- [ ] Add the `organisation_owner` role.
- [ ] Add `organisations.owner_profile_id`, referencing `profiles.id`, and require the selected owner profile to belong to that organisation.
- [ ] Assign and change the organisation owner from the super-admin organisation form.
- [ ] Make dashboard and analytics read-only.
- [ ] Expose only anonymised responses and aggregate analytics; never expose respondent identity mappings to organisation owners.
- [ ] Enforce the owner boundary in RLS/backend queries rather than relying on hidden frontend fields.
- [ ] Add read-only question viewing.

### Phase 5 Imports and communication

- [x] Add downloadable user-import template.
- [x] Add validation and preview.
- [x] Add backend bulk user import.
- [x] Add manager relationship resolution.
- [x] Add temporary-password account creation and the Postmark `tempaccess` sender.
- [x] Force temporary-password replacement before protected portal access.
- [ ] Add bulk participant assignment.
- [x] Add Postmark survey invitation template and sender.
- [x] Implement CXW-7 survey reminders.
- [x] Implement CXW-8 completion receipts.
- [ ] Add first-party email analytics later; Postmark remains the current analytics source.

## Jira work tracking notes

These are implementation notes and do not change Jira statuses automatically.

| Issue | Working state | Notes |
| --- | --- | --- |
| CXW-6 | In progress | Organisation IDs and initial scoping exist; organisation selector, memberships, survey list and RLS remain. |
| CXW-7 | Implemented, acceptance deferred | Sends Postmark reminders only to incomplete invited respondents, records successful sends in `reminded_at`, and blocks non-live or closed surveys. End-to-end acceptance waits for organisation and multi-survey selection. |
| CXW-8 | Implemented, acceptance deferred | A secret-protected database webhook sends an idempotent Postmark receipt after a new response is committed. End-to-end acceptance waits for organisation and multi-survey selection. |
| CXW-9 | Implemented, needs acceptance | Response counts use actual survey respondents and response rows. |
| CXW-14 | Partially supported | Started-not-completed count exists; partial-answer analytics and export need separate implementation. |
| CXW-15 | Implemented, needs acceptance | Expired live surveys are treated as closed and manual-stop behaviour is clearer. |

## Open decisions

- Whether consultants may access every organisation or only assigned organisations. The architecture assumes assigned access.
- Whether organisation owners can see small-group analytics that might identify individuals. A minimum reporting-group size should be defined.
- Employees use password accounts. New managed users receive a generated temporary password through Postmark and must replace it immediately after first login.
- Whether several surveys may be live simultaneously for one organisation. The architecture supports this and employee access must be assignment-based.
- Whether deleting organisations is ever allowed. Deactivation is recommended.
- Required retention rules for respondent identities, responses and email delivery records.

## Change log

### 23 November 2026

- Added the authenticated survey-invitation API using the Postmark `survey` template.
- Added unique respondent survey links, organisation branding, Johannesburg opening and closing dates, closed-survey protection and per-recipient send results.
- Updated the consultant invitation action to report the actual number accepted by Postmark and retain failed rows for correction.
- Added CXW-7 reminder delivery through the Postmark `reminder` template with incomplete-respondent filtering and actual send totals.
- Added CXW-8 Postmark survey receipts through a secret-protected database webhook with duplicate-send protection.
- Deferred end-to-end invitation, reminder and receipt testing until organisation management and explicit multi-survey selection are in place.
- Deferred first-party email event analytics until the client-required workflows are complete; Postmark remains the current analytics source.
- Confirmed that survey templates are managed by super administrators only.
- Confirmed the four-tab survey structure: Survey List, Survey Builder, Survey Controls and Survey Settings.
- Confirmed organisation owners will be assigned through an explicit organisation owner profile ID and will have read-only access to anonymised responses and analytics only.

### 20 November 2026

- Implemented temporary-password account creation, Postmark `tempaccess` delivery and forced first-login password replacement.
- Added organisation logo/banner storage paths and onboarding delivery metadata to the migration history.
- Recorded that the four Postmark templates have been created.
- Prioritised standalone organisation CRUD, user CRUD and survey modules before backend email integration.
- Split delivery into a standalone module stage followed by multi-organisation and multi-survey orchestration.
- Recorded the organisation profile fields and the missing registration number.
- Recorded the missing migration baseline and backup prerequisites.
- Captured and registered `20261120065558_remote_schema.sql` as the production migration baseline.
- Recorded the dashboard-first migration workflow: SQL Editor change, immediate remote pull, migration-history update and Git commit.
- Restricted the Configuration navigation group to super administrators.
- Recorded the Auth plus profile user-management data model and the current `client` and `superadmin` role inventory.
- Added the root Vercel `api/users` server endpoint for secured super-admin user CRUD; the browser now calls it through `src/features/users/services/usersClient.ts` and no longer targets a Supabase Edge Function for this workflow.

### 19 November 2026

- Created this living architecture and roadmap document.
- Recorded the global organisation selector and separate survey selector model.
- Recorded role separation between super administrator, consultant, organisation owner and employee.
- Recorded the need for consultant-to-organisation memberships.
- Recorded the Postmark template plus TypeScript backend email design.
- Recorded the RLS requirement and implementation phases.
- Recorded the respondent account-claim flow and the four proposed email types.
- Recorded consultant-managed employee fields and employee read-only enforcement.
