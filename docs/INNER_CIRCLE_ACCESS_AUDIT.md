# Inner Circle access and value audit · 31 October 2026

## Observed live

The public URL /#inner-circle opens a credential form before the benefits, sample or editorial proposition. The form offers application, but a visitor is first presented with a member sign-in task. The homepage also contains a separate sign-in implementation. The new editorial and decision-workspace experience is in PR 147, not the deployed public site at the time of inspection.

## Refined journey

- Public: audience, tangible outputs, free/manual membership conditions, illustrative sample, edition outline and application process. No credentials required to understand the offer.
- Applicant: direct application with editable email, professional profile and optional purpose. Submission does not activate a paid plan or grant access.
- Approved member: explicit sign-in, full edition, dossiers and personal decision workspace. The member area stops selling membership to someone already admitted.
- Paid subscriptions and Advisory remain separate and do not imply Inner Circle approval.

Removed the second homepage login implementation. Both routes use the same access component and API path. The overview has separate application and member-login actions, a return path and credential support link. Each sample uses a unique identifier. Overlay content is marked as a dialog; the underlying homepage is inert and hidden from assistive technology while it is open. Removed the duplicate fixed home button that overlapped the Inner Circle brand.

## Access weaknesses verified in code

1. The server previously accepted an approved membership row without a password hash. This revision denies that login; accounts lacking a configured password will require credential setup before sign-in. Valid password verification is preserved.
2. The client previously admitted a cached boolean on verification/network error. This revision clears that flag and denies access on error. Redirect moved out of rendering into an effect.
3. IMPORTANT REMAINING: the membership check still identifies a member by email rather than a server-authenticated session. Browser state is not proof of identity. This revision does not establish a secure session architecture.
4. IMPORTANT REMAINING: editorial text and member components are shipped in the frontend bundle. A presentation gate does not make that content confidential. Sensitive files, mandates or member data require authenticated server delivery and authorization on each protected request before being placed here.
5. The complete PDF was created as a separate deliverable; this PR has not introduced a protected PDF download endpoint.

These findings were established by source inspection. No real member identity, password or bypass was used against production. No applications were submitted during QA.

## Validation

Seven tests pass: public overview before credentials; refusal of passwordless approved account; successful/unsuccessful password RPC verification; four existing decision calculation and export tests. Production build passes. The built static site was served through managed preview, avoiding the Vite host limitation without changing application development-host permissions. Browser inspection verified public overview, sample expansion and application-form navigation. Full authenticated sign-in was not tested with a real account. Final narrow-device inspection remains pending if no responsive viewport control is available.

## Publication

Changes remain in PR 147. Do not represent the current membership gate as adequate protection for confidential data. Next technical milestone: authenticated server sessions, revocation, uniform protected endpoints and server delivery for restricted content.
