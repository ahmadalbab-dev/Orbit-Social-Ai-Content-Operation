# Orbit customer email

Requested sender display name: **aistudio.orbit**.

This is a display name, not an email address. Do not invent a sender domain or reuse an unrelated project's SMTP credentials.

For the dedicated Orbit Supabase project, configure Authentication > Email > SMTP Settings with an existing, verified SMTP sender. Set Sender name to `aistudio.orbit`; Sender email must be an address authorized by the chosen provider. Enter SMTP credentials directly in the provider dashboard, never in source control or chat.

Apply `confirm-signup.html` to Authentication > Email > Templates > Confirm signup, subject `Confirm your email | aistudio.orbit`. Keep `{{ .ConfirmationURL }}` intact so Supabase handles verification and the allowlisted redirect. Recovery must continue including `{{ .Token }}` because Orbit's recovery screen uses the emailed code.

The default Supabase delivery service does not provide commercial branded sending to arbitrary customers. Custom SMTP/domain verification is a separate prerequisite, not a frontend change. The template in this folder is prepared, not proof that hosted configuration has been applied.

Acceptance: register a user-controlled address, receive exactly the intended branding, confirm once, return to sign-in with verified confirmation notice, sign in, create/select a workspace, reach the main page. A reused/expired email link must show guidance and must not grant a workspace session. Do not create real users or send test emails without an explicitly provided recipient.
