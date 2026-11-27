# Implementation notes

## Preserve existing functionality

- Adding a function, page, filter, navigation option, or control does not authorise replacing or removing an existing function.
- Extend the current workflow by default. Preserve existing behaviour and controls unless the requested change is incompatible with them.
- If a replacement or removal appears necessary, explain the conflict and obtain explicit approval before making that change.
- Example: adding an Active Surveys page or client navigation must not remove or replace the existing survey-list selector/dropdown. Both functions should remain available unless the user explicitly requests otherwise.

## Product scope exclusions

- Do not build CXW-25, Project Planning & Strategy Management, in CultureXe.
- Project planning and strategy management already belong to another product. Implementing the same capability in CultureXe would duplicate product functionality and development effort.
- Treat CXW-25 as out of scope when planning or recommending the next CultureXe work item unless the user explicitly reverses this decision.

## CXW-24 checkpoint — 27 November 2026

Work completed before the temporary deviation:

- Restored and preserved the client survey selector in the top bar.
- Added survey classification: Culture, Pulse, 360 and Other.
- Added the Full culture model flag. Only full-model Culture assessments may contribute to the overall culture score.
- Added all-survey consultant dashboard portfolio totals without removing the established engagement metrics.
- Fixed duplicate Supabase realtime channel topics in `useSurveys`; every mounted subscription now has a unique topic.
- Enforced assignment-only client survey visibility. Organisation membership alone does not grant access.
- Removed automatic survey enrolment from the new-user trigger.
- Prevented clients from creating their own respondent assignments.
- Replaced broad anonymous survey access with invitation/open-token-scoped functions.
- Added the client Active Surveys page and sidebar item without removing Home, Profile or the top-bar selector.
- Confirmed invitation and reminder delivery still runs through authorised server endpoints/service-role clients. All invitation and reminder policy tests pass.
- Implemented the client Culture Score and historical comparison block. It uses only assigned, closed, full-model Culture assessments and returns aggregate results only.

Database migration and validation state:

1. `20261127130000_classify_surveys.sql` — applied; validator passed.
2. `20261127140000_enforce_assigned_survey_visibility.sql` — applied; reported checks passed.
3. `20261127141000_prevent_client_self_assignment.sql` — applied; validator passed.
4. `20261127142000_client_culture_score_history.sql` — applied. All checks passed except the retained explicit anonymous execute privilege.
5. `20261127143000_revoke_anonymous_culture_history.sql` — applied; the focused anonymous-access validator passed.

Current verification state:

- TypeScript passes.
- Production build passes.
- All 32 existing automated tests pass.
- No packages were installed.

Resume point:

1. Verify the Culture Score block with a client assigned to a closed survey marked Culture + Full culture model.
2. Continue CXW-24 with the client News and Updates task.

## Error normalization deviation — 27 November 2026

- Added one shared error catalogue for database, API, authentication, email,
  file, network, validation and unknown failures.
- API errors retain their existing fields and now also return a safe `message`,
  stable `code` and unique support `reference`.
- Failed bulk-import rows receive their own code and reference.
- Technical details are logged against the reference but suppressed from the UI.
- Error toasts show the safe message, code and reference. Unhandled browser errors,
  rejected promises and the application error boundary use the same path.
- Existing invite, reminder, survey, user, organisation, template, file and export
  workflows were preserved; only their error presentation was normalized.
- Added stable `CX004`, `CX005` and `CX006` database exceptions to the current
  respondent submission function without changing its timing or access behavior.
- Migration `20261127144000_normalise_submit_error_codes.sql` was applied. All six
  validator checks passed with `issue_count = 0`, including access, fixed search
  path, stable codes and preservation of submission timing.
- TypeScript, the production build and all 43 automated tests pass.
