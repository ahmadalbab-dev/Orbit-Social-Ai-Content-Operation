import { LegalPage } from "../legal-content";

export default function DataDeletionPage() {
  return <LegalPage eyebrow="Account control" title="Data Deletion Instructions" summary="How to revoke connected-platform access and request deletion of Orbit Social workspace data.">
    <h2>Option 1: Revoke platform access immediately</h2>
    <p>Open the connected platform&apos;s account settings, find Apps and Websites or Business Integrations, select the Orbit Social or Meta developer application, and remove its access. This prevents future API access but may not automatically remove records already stored by Orbit.</p>
    <h2>Option 2: Request Orbit deletion</h2>
    <ol className="list-decimal space-y-2 pl-6">
      <li>Email <a className="underline" href="mailto:ahmadalbab.dev@gmail.com">ahmadalbab.dev@gmail.com</a>.</li>
      <li>Use the subject “Orbit Social Data Deletion Request.”</li>
      <li>Include the platform name and account username only. Do not send a password, token, one-time code, recovery code, medical information, or identity document initially.</li>
      <li>The administrator will verify account control securely and provide a deletion confirmation reference.</li>
    </ol>
    <h2>What will be deleted</h2>
    <p>After verification, Orbit will delete or anonymize stored OAuth tokens, social-account identifiers, drafts, schedules, media references, publishing records, and workspace analytics unless retention is required for security, legal compliance, or an unresolved dispute.</p>
    <h2>Timing</h2>
    <p>Access tokens should be revoked promptly after verification. The request will be completed within 30 days unless a longer period is required by law or necessary to resolve a security issue.</p>
    <h2>Meta callback note</h2>
    <p>This page provides user-facing deletion instructions. A signed Meta data-deletion callback and status endpoint must also be implemented before the Meta app moves from Development to Live mode.</p>
  </LegalPage>;
}
