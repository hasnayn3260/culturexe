export type PendingInvitationRespondent = {
  invited_at: string | null
  source: string | null
  submitted_at: string | null
}

export function isPendingSurveyInvitation(
  respondent: PendingInvitationRespondent,
): boolean {
  return !respondent.invited_at &&
    !respondent.submitted_at &&
    respondent.source !== 'open_link' &&
    ['assigned', 'invited'].includes(respondent.source || '')
}
