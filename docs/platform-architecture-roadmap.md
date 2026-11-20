# CultureXe Platform Architecture and Roadmap

Last updated: 20 November 2026

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

### Respondent account invitation

Requirement: when a consultant uploads respondent details and assigns the respondent to a survey, the respondent must receive access to the pre-populated profile and the assigned survey.

Recommended flow:

1. The consultant imports the employee record and selects the organisation.
2. A trusted backend function creates or identifies the Supabase Auth user.
3. The backend links `profiles.id` to the Auth user ID and preserves the imported organisation, manager, department, location and job details.
4. The backend creates the `survey_respondents` assignment for the selected survey.
5. For a new account, Supabase generates a one-time invitation link.
6. CultureXe sends an account invitation through the authentication email flow, directing the respondent to choose their own password.
7. After account setup, the redirect returns the respondent to the assigned survey.
8. For an existing account, CultureXe sends a normal survey invitation linking to the assigned survey.

Do not email reusable temporary passwords. A one-time, expiring invitation link provides the same first-access experience without exposing credentials in an inbox or requiring custom forced-password-change logic.

Proposed email types:

- `account-invitation`: new respondent account claim and password setup.
- `survey-invitation`: existing user assigned to a survey.
- `survey-reminder`: assigned respondent has not submitted.
- `survey-completed`: confirmation after successful submission.

Authentication invitation and recovery links must have link tracking disabled so an email-security scanner or tracking redirect does not interfere with the one-time token.

## Email architecture

### Postmark templates

Initial templates:

- `survey-invitation`
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
- After the baseline is established, make new schema changes through local migration files and deploy them with the Supabase CLI.

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
- [ ] Capture the current remote schema as the initial migration baseline.
- [ ] Create `organisation_memberships`.
- [ ] Define and migrate role values.
- [ ] Decide which existing users are super administrators, consultants, organisation owners and employees.
- [ ] Add organisation and survey helper functions used by RLS.
- [ ] Enable and test RLS table by table.
- [ ] Add automated cross-organisation access tests.

### Phase 2 Multi-survey application state

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
- [ ] Separate Survey Builder and Survey Controls.
- [ ] Scope Dashboard and Analytics to the selected survey.
- [ ] Add organisation management.
- [ ] Add user management scoped to the selected organisation.

### Phase 4 Organisation owner interface

- [ ] Add the `organisation_owner` role.
- [ ] Make dashboard and analytics read-only.
- [ ] Remove identifiable respondent data.
- [ ] Add read-only question viewing.
- [ ] Add question comments.

### Phase 5 Imports and communication

- [ ] Add downloadable user-import template.
- [ ] Add validation and preview.
- [ ] Add backend bulk user import.
- [ ] Add manager relationship resolution.
- [ ] Add bulk participant assignment.
- [ ] Add Postmark survey invitation template and sender.
- [ ] Implement CXW-7 survey reminders.
- [ ] Implement CXW-8 completion receipts.
- [ ] Record email delivery results and Postmark message IDs.

## Jira work tracking notes

These are implementation notes and do not change Jira statuses automatically.

| Issue | Working state | Notes |
| --- | --- | --- |
| CXW-6 | In progress | Organisation IDs and initial scoping exist; organisation selector, memberships, survey list and RLS remain. |
| CXW-7 | Planned | Current reminder action updates `reminded_at`; it does not yet send an email. |
| CXW-8 | Planned | Reuse the backend Postmark email service after reminders. |
| CXW-9 | Implemented, needs acceptance | Response counts use actual survey respondents and response rows. |
| CXW-14 | Partially supported | Started-not-completed count exists; partial-answer analytics and export need separate implementation. |
| CXW-15 | Implemented, needs acceptance | Expired live surveys are treated as closed and manual-stop behaviour is clearer. |

## Open decisions

- Whether consultants may access every organisation or only assigned organisations. The architecture assumes assigned access.
- Whether organisation owners can see small-group analytics that might identify individuals. A minimum reporting-group size should be defined.
- Whether employees use password accounts, magic links or invitation-based account setup.
- Respondent onboarding recommendation is an expiring account invitation that leads to password setup. Confirm this before implementation; emailing temporary passwords is not recommended.
- Whether several surveys may be live simultaneously for one organisation. The architecture supports this and employee access must be assignment-based.
- Whether deleting organisations is ever allowed. Deactivation is recommended.
- Required retention rules for respondent identities, responses and email delivery records.

## Change log

### 20 November 2026

- Recorded that the four Postmark templates have been created.
- Prioritised standalone organisation CRUD, user CRUD and survey modules before backend email integration.
- Split delivery into a standalone module stage followed by multi-organisation and multi-survey orchestration.
- Recorded the organisation profile fields and the missing registration number.
- Recorded the missing migration baseline and backup prerequisites.

### 19 November 2026

- Created this living architecture and roadmap document.
- Recorded the global organisation selector and separate survey selector model.
- Recorded role separation between super administrator, consultant, organisation owner and employee.
- Recorded the need for consultant-to-organisation memberships.
- Recorded the Postmark template plus TypeScript backend email design.
- Recorded the RLS requirement and implementation phases.
- Recorded the respondent account-claim flow and the four proposed email types.
- Recorded consultant-managed employee fields and employee read-only enforcement.
