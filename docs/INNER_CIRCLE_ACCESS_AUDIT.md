# Inner Circle: public preview and approved-member workspace

The public page shows a concise contents preview, a sample decision brief and the application/sign-in actions. It does not contain the full monthly edition or dossiers. Membership is free during the introductory stage, with manual approval. There is no automatic conversion to payment or invented expiry date; any future price change requires prior notice and acceptance. Paid platform plans and Advisory remain separate.

Opening Inner Circle first checks for an active signed session. With a valid session and current approved status, the member enters the workspace directly. Visitors and expired sessions see the public preview; they can apply or sign in. The member workspace identifies approved access and provides Sign out, without an application sales pitch.

## Authorization and delivery

Password verification still uses the existing Supabase RPC. Success issues a signed session valid for 24 hours, using an HMAC key derived from the existing server-only service credential. A stored email or approval flag is not authentication. The content endpoint verifies the signature and expiry and rechecks current membership approval before returning content. Rejected, expired and revoked sessions cannot retrieve it. The complete edition, dossiers and their English translations are no longer imported into browser assets.

The public custom domain does not serve the API. The browser therefore uses the existing Workers API origin and an Authorization bearer token, stored in the application origin’s local storage, to avoid depending on third-party cookies in Safari. CORS permits only the existing production origins and Authorization preflight. Browser-side script compromise would expose this token; no personal project material is sent in it. Cookies are additionally HttpOnly, Secure and SameSite=Lax when the API is accessed directly.

Sign out clears the local token and API cookie. Signed tokens cannot be individually revoked before expiry; revoking membership denies subsequent content requests. Signing-key rotation invalidates all sessions. Existing members using the old browser flag must sign in once after this upgrade.

Private responses use no-store. Previously public editions cannot be made secret retroactively. The editorial material is informational; the workspace does not promise confidential transaction delivery. The separate PDF still has no member download endpoint.

## Validation

Tests cover anonymous/email-only denial, correct password verification, signed cookie and bearer access, permitted CORS preflight, forged and expired sessions, membership revocation and sign out, along with Spanish/English rendering, public bundle exclusion and decision-brief export/calculations. Full sign-in using a real approved member remains an operational validation requiring that member’s credentials.

Decision briefs save only in the current browser and can be exported; there is no account sync or reminder service.
