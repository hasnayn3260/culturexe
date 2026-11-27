# CultureXE error-code registry

Database, API and client errors that reach a user must use a stable CultureXE code.
UI copy is mapped from the code rather than displaying raw database, authentication,
email-provider or stack-trace details. PostgreSQL codes use the vendor class `CX`
followed by three digits. Application codes use the `CXE-<AREA>-<NUMBER>` format.

| Code | Source | Meaning | Intended user message |
| --- | --- | --- | --- |
| `CX001` | `save_survey_draft`, `start_survey_response`, `record_survey_access` | Survey access token was not supplied. | This survey link is incomplete. Please reopen the link from your email. |
| `CX002` | `save_survey_draft` | Draft answers were not a JSON object. | Your progress could not be saved because the answer data is invalid. |
| `CX003` | `save_survey_draft` | Draft payload exceeded 1 MB. | Your saved progress is too large. Please contact support. |
| `CX004` | `save_survey_draft`, `start_survey_response`, `record_survey_access` | Survey token does not match a respondent. | This survey link is invalid or has expired. |
| `CX005` | `save_survey_draft`, `start_survey_response` | Respondent has already submitted. | This survey has already been submitted. |
| `CX006` | `save_survey_draft`, `start_survey_response` | Survey is not accepting responses. | This survey is closed and is no longer accepting responses. |
| `CX007` | `record_survey_access` | The client did not supply its page-load access identifier. | This survey visit could not be recorded. Please refresh the page. |

## Application codes

| Code | Area | Meaning | Intended user message |
| --- | --- | --- | --- |
| `CXE-AUTH-001` | Authentication | Sign-in is required. | Please sign in to continue. |
| `CXE-AUTH-002` | Authentication | Session expired. | Your session has expired. Please sign in again. |
| `CXE-AUTH-003` | Authorisation | User cannot perform the action. | You do not have permission to perform this action. |
| `CXE-VAL-001` | Validation | Submitted information is invalid. | Some information is invalid. Check the highlighted fields and try again. |
| `CXE-DATA-001` | Data | Requested record does not exist. | The requested record could not be found. |
| `CXE-DATA-002` | Data | Change conflicts with existing data. | This change conflicts with existing information. |
| `CXE-DATA-003` | Users | Duplicate email address. | An account already uses this email address. |
| `CXE-DATA-004` | Users | Duplicate phone number. | An account already uses this phone number. |
| `CXE-DATA-005` | Organisations | Email does not match the organisation domain. | The email address must match the organisation’s configured domain. |
| `CXE-DATA-006` | Users | Manager is not eligible for the organisation. | The selected manager could not be found in this organisation. |
| `CXE-SUR-001` | Surveys | Survey link or token is invalid. | This survey link is invalid or has expired. |
| `CXE-SUR-002` | Surveys | Survey is not accepting responses. | This survey is not currently accepting responses. |
| `CXE-SUR-003` | Surveys | Response was already submitted. | This survey has already been submitted. |
| `CXE-EMAIL-001` | Email | Provider could not accept or deliver email. | The email could not be sent. Please try again shortly. |
| `CXE-FILE-001` | Files | Upload or file processing failed. | The file could not be processed. Check the file and try again. |
| `CXE-NET-001` | Network | Browser could not reach the service. | The service could not be reached. Check your connection and try again. |
| `CXE-RATE-001` | Rate limiting | Request limit was exceeded. | Too many requests were made. Wait a moment and try again. |
| `CXE-SRV-001` | Service | Internal or upstream service failure. | Something went wrong while processing your request. |
| `CXE-UNK-001` | Fallback | Unclassified failure. | Something went wrong. Please try again. |

## API error contract

Error responses retain the legacy `error` property and add normalized support data:

```json
{
  "error": "An account already uses this phone number.",
  "message": "An account already uses this phone number.",
  "code": "CXE-DATA-004",
  "reference": "CX-AB12CD34"
}
```

Bulk-operation failed rows use the same `message`, `code` and `reference` fields.
The frontend displays the safe message, code and reference in its error toast. Support
uses the reference to correlate the user report with server logs. Unknown and server
failures never expose raw technical details to the user.

## Rules for future codes

1. Never reuse a code for a different condition.
2. Add the code here in the same change that introduces it.
3. Do not expose raw database errors in the interface.
4. Unknown codes use a generic fallback toast and are logged for diagnosis.
5. Every SQL delivery must include a validator query covering its objects,
   permissions, constraints and relevant data integrity checks.
6. Preserve existing success and error response fields when adopting the envelope.
7. Log technical detail with the same reference; never put it in a toast or error page.
