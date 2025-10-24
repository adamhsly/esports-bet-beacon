-- Insert cookie policy page into CMS
INSERT INTO pages (slug, title, content_markdown, seo_title, seo_description)
VALUES (
  'cookies',
  'Cookie Policy',
  '# Cookie Policy

**Last updated:** October 2025  
**Website:** [https://fragsandfortunes.com](https://fragsandfortunes.com)  
**Company:** *Frags & Fortunes Ltd*  
**Location:** United Kingdom  

---

## 1. Introduction

This Cookie Policy explains how **Frags & Fortunes Ltd** ("we", "our", "us") uses cookies and similar technologies on [https://fragsandfortunes.com](https://fragsandfortunes.com). It explains what these technologies are, why we use them, and your rights to control how they are used.

For more information on how we use, store, and keep your personal data secure, see our [Privacy Policy].

---

## 2. What Are Cookies?

Cookies are small text files that are placed on your device (computer, phone, or tablet) when you visit a website. They help us make our site work properly, improve performance, and provide insights into how our visitors use it.

Cookies may be:
- **First-party cookies** – set by our website directly.
- **Third-party cookies** – set by external services such as analytics or payment providers.

---

## 3. How We Use Cookies

We use cookies for the following purposes:

- To ensure the website functions properly.
- To analyse how visitors use our site and improve user experience.
- To enable secure payments and session management.

We never use cookies to collect sensitive personal information without your consent.

---

## 4. Types of Cookies We Use

### A. Necessary Cookies

These cookies are essential for the website to function and cannot be switched off in our systems. They are usually set in response to actions you take such as setting your privacy preferences, logging in, or filling out forms.

| Cookie ID | Domain | Duration | Description |
|------------|---------|-----------|--------------|
| __cf_bm | .supabase.co | 1 hour | This cookie, set by Cloudflare, is used to support Cloudflare Bot Management. |

---

### B. Analytics and Tracking Cookies

These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.

| Cookie ID | Domain | Duration | Description |
|------------|---------|-----------|--------------|
| _ga | .fragsandfortunes.com | 1 year 1 month 4 days | Google Analytics sets this cookie to calculate visitor, session and campaign data and track site usage for the site''s analytics report. The cookie stores information anonymously and assigns a randomly generated number to recognise unique visitors. |
| _ga_* | .fragsandfortunes.com | 1 year 1 month 4 days | Google Analytics sets this cookie to store and count page views. |

---

### C. Functional / Session Cookies

These cookies allow certain features and payment functions to work correctly on our site.

| Cookie ID | Domain | Duration | Description |
|------------|---------|-----------|--------------|
| session-id | www.fragsandfortunes.com | 1 hour | Amazon Pay uses this cookie to maintain a session that spans multiple visits. The session information includes the identity of the user, recently visited links, and duration of inactivity. |

---

## 5. Managing Your Cookie Preferences

When you first visit our website, a cookie banner will appear allowing you to accept or reject non-essential cookies. You can change your preferences at any time by clicking the **Cookie Settings** link in the footer of our site.

Alternatively, you can block or delete cookies through your browser settings. Please note that disabling some cookies may affect the functionality of the site.

**Browser links for cookie management:**
- [Google Chrome](https://support.google.com/chrome/answer/95647)
- [Mozilla Firefox](https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox)
- [Safari](https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac)
- [Microsoft Edge](https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09)

---

## 6. Updates to This Policy

We may update this Cookie Policy from time to time to reflect changes in our practices or for operational, legal, or regulatory reasons. The latest version will always be available on our website with the "Last updated" date at the top.

---

## 7. Contact Us

If you have any questions about this Cookie Policy or our use of cookies, please contact us at:

**Frags & Fortunes Ltd**  
Email: [insert your contact email]  
Location: United Kingdom',
  'Cookie Policy | Frags & Fortunes',
  'Learn how Frags & Fortunes uses cookies and similar technologies. Manage your cookie preferences and understand your privacy rights.'
)
ON CONFLICT (slug) DO UPDATE SET
  content_markdown = EXCLUDED.content_markdown,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = now();