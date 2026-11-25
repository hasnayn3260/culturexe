# CultureXE error-code registry

Database and API errors that need a user-facing toast must use a stable CultureXE
code. UI copy should be mapped from the code rather than displaying raw database
messages. PostgreSQL codes use the vendor class `CX` followed by three digits.

| Code | Source | Meaning | Intended user message |
| --- | --- | --- | --- |
| `CX001` | `save_survey_draft`, `start_survey_response` | Survey access token was not supplied. | This survey link is incomplete. Please reopen the link from your email. |
| `CX002` | `save_survey_draft` | Draft answers were not a JSON object. | Your progress could not be saved because the answer data is invalid. |
| `CX003` | `save_survey_draft` | Draft payload exceeded 1 MB. | Your saved progress is too large. Please contact support. |
| `CX004` | `save_survey_draft`, `start_survey_response` | Survey token does not match a respondent. | This survey link is invalid or has expired. |
| `CX005` | `save_survey_draft`, `start_survey_response` | Respondent has already submitted. | This survey has already been submitted. |
| `CX006` | `save_survey_draft`, `start_survey_response` | Survey is not accepting responses. | This survey is closed and is no longer accepting responses. |

## Rules for future codes

1. Never reuse a code for a different condition.
2. Add the code here in the same change that introduces it.
3. Do not expose raw database errors in the interface.
4. Unknown codes use a generic fallback toast and are logged for diagnosis.
5. Every SQL delivery must include a validator query covering its objects,
   permissions, constraints and relevant data integrity checks.
