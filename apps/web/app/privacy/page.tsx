import { LegalPage } from "../legal-content";

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" summary="How Orbit Social handles workspace information, social-account authorization, generated content, and usage data.">
    <h2>1. Scope</h2>
    <p>This policy applies to Orbit Social, a social-media content operations application managed for the 4life Malaysia workspace. It covers the web application, API, social integrations, content automation, and related support interactions.</p>
    <h2>2. Information we process</h2>
    <ul>
      <li>Workspace, brand, campaign, approval, scheduling, and audit information.</li>
      <li>Content prompts, generated drafts, uploaded media, and publishing results.</li>
      <li>Social-account identifiers and OAuth access or refresh tokens granted through official platform consent screens.</li>
      <li>Operational information such as errors, rate limits, estimated AI usage, and aggregate post analytics.</li>
    </ul>
    <p>Orbit Social does not require social-media passwords. Passwords, one-time codes, and recovery codes must only be entered on the relevant platform&apos;s official website.</p>
    <h2>3. How information is used</h2>
    <p>Information is used to create and review content, schedule and publish approved posts, display analytics, control AI costs, maintain security, troubleshoot failures, and comply with deletion or revocation requests.</p>
    <h2>4. Service providers</h2>
    <p>Depending on deployment, information may be processed by hosting, database, storage, AI, monitoring, and social-platform providers. Production providers and locations will be documented before public launch.</p>
    <h2>5. Retention and security</h2>
    <p>OAuth tokens must be encrypted at rest and excluded from source control. Access is limited by workspace membership and role. Records are retained only while operationally necessary or legally required.</p>
    <h2>6. Your choices</h2>
    <p>You can revoke a social connection from the platform&apos;s account settings. You can also request deletion using the <a className="underline" href="/data-deletion">Orbit Social data-deletion instructions</a>.</p>
    <h2>7. Children and wellness content</h2>
    <p>Orbit Social is intended for business users, not children. Generated wellness content must be reviewed by a human and must not be treated as medical advice.</p>
    <h2>8. Contact</h2>
    <p>Contact <a className="underline" href="mailto:ahmadalbab.dev@gmail.com">ahmadalbab.dev@gmail.com</a> with the subject “Orbit Social Privacy Request.” Do not include passwords, tokens, medical details, or identity documents in the initial message.</p>
  </LegalPage>;
}
