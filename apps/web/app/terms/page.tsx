import { LegalPage } from "../legal-content";

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of Use" summary="Rules for using Orbit Social responsibly, safely, and in compliance with connected social platforms.">
    <h2>1. Acceptance and eligibility</h2>
    <p>By using Orbit Social, you confirm that you are authorized to act for the workspace and connected social accounts and that you will follow these terms and each platform&apos;s applicable policies.</p>
    <h2>2. Human approval remains required</h2>
    <p>AI-generated content may be incomplete or inaccurate. You are responsible for checking facts, claims, disclosures, links, media rights, prices, availability, and platform suitability before publication.</p>
    <h2>3. Wellness and product communications</h2>
    <p>Orbit Social is not a medical service. Do not publish content that diagnoses, treats, cures, prevents, or guarantees outcomes unless the statement is lawful, substantiated, and expressly approved for use.</p>
    <h2>4. Account and platform compliance</h2>
    <ul>
      <li>Use official OAuth authorization and never share passwords with Orbit administrators.</li>
      <li>Connect only accounts you own or are authorized to manage.</li>
      <li>Respect platform terms, rate limits, review requirements, and community standards.</li>
      <li>Do not use Orbit for spam, deceptive engagement, impersonation, harassment, or unlawful content.</li>
    </ul>
    <h2>5. Automation and availability</h2>
    <p>Scheduled publishing depends on third-party APIs and may fail or be delayed. Approval gates, budget limits, retries, and idempotency reduce risk but do not guarantee publication or commercial results.</p>
    <h2>6. Intellectual property</h2>
    <p>You must have appropriate rights to logos, product images, music, testimonials, and other assets. Third-party brands remain the property of their owners.</p>
    <h2>7. Suspension and termination</h2>
    <p>Access may be paused for suspected compromise, policy violations, excessive automated activity, or revoked platform authorization. You may stop using Orbit and request deletion at any time.</p>
    <h2>8. Disclaimer and liability</h2>
    <p>Orbit Social is provided on an “as available” basis. To the extent permitted by law, the operator is not responsible for indirect losses, platform enforcement decisions, missed schedules, generated inaccuracies, or business outcomes.</p>
    <h2>9. Contact</h2>
    <p>Contact <a className="underline" href="mailto:ahmadalbab.dev@gmail.com">ahmadalbab.dev@gmail.com</a> with the subject “Orbit Social Terms Request.”</p>
  </LegalPage>;
}
