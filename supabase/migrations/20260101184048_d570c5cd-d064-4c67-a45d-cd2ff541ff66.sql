UPDATE pages 
SET content_markdown = '# Privacy Policy

**Last updated: 1 January 2026**

## 1. Who We Are

Frags & Fortunes is the data controller of your personal data.
Contact: theteam@fragsandfortunes.com

---

## 2. Information We Collect

- Account details (email, username, password)
- Usage data (IP address, device, interactions)
- Communications you send us
- Cookies and analytics data

---

## 3. How We Use Data

- Provide and operate the Site
- Manage accounts and contests
- Communicate with users
- Improve performance and security
- Meet legal obligations

---

## 4. Legal Basis

We process personal data under:

- Contract
- Legitimate interests
- Consent (where applicable)
- Legal obligations

---

## 5. Data Sharing

We may share data with:

- Hosting and infrastructure providers
- Analytics and email services
- Legal authorities if required

We do not sell personal data.

---

## 6. International Transfers

Data may be processed outside the EEA using appropriate safeguards.

---

## 7. Retention

We retain data only as long as necessary for the purposes described.

---

## 8. Your Rights

You have the right to:

- Access
- Correction
- Deletion
- Restriction of processing
- Objection
- Data portability

Contact us to exercise these rights.

---

## 9. Cookies

We use cookies for:

- Site functionality
- Analytics
- Security

See the Cookie Policy for details.

---

## 10. Security

We use reasonable measures to protect data but cannot guarantee absolute security.

---

## 11. Changes

We may update this policy periodically.',
    updated_at = now()
WHERE slug = 'privacy';