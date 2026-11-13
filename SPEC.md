# shawaz.org — Specification

## Purpose and users

Shawaz Imam's personal portfolio and résumé site. Readers are recruiters, clients and anyone checking his work. It also hosts the privacy policy and terms that Google requires for his personal OAuth apps (Life Ops).

## Scope and non-goals

- In scope: static pages (`index.html`, `case-study.html`, `resume.html`, `privacy.html`, `terms.html`, `404.html`) and their styles, scripts and images.
- Non-goals: no backend, no build step, no forms, no tracking beyond what is already on the pages.

## Domain glossary

- **Résumé PDF:** `Images/Shawaz_Resume.pdf`, rendered from `resume.html`.
- **Legal pages:** `privacy.html` and `terms.html`, linked from the Google OAuth consent screen of the owner's personal apps.

## Business rules

- **BR-1:** The site names no business, client, vendor, production domain, host, phone number or deployed stack (owner, 2026-10-03: "stop revealing information about production in our public profiles").
- **BR-2:** Only roles and claims backed by real repos or the owner's confirmation appear. The pre-2026 résumé is not a source.
- **BR-3:** The résumé PDF is exactly one page.
- **BR-4:** The legal pages describe only the owner's personal tools, name no business or client, and are `noindex`.

## Functional requirements

- **FR-1:** `index.html` presents the portfolio. Acceptance: it loads at https://shawaz.org/ with no console errors.
- **FR-2:** `resume.html` prints to a one-page PDF. Acceptance: `pdfinfo` reports `Pages: 1`.
- **FR-3:** `privacy.html` states what Google data the owner's tools access, that it isn't shared or sold, that use complies with the Google API Services User Data Policy (Limited Use), and how to revoke access. Acceptance: it is served at https://shawaz.org/privacy.html.
- **FR-4:** `terms.html` states the tools are personal, provided as is, and links the privacy policy. Acceptance: it is served at https://shawaz.org/terms.html.

## Data model and sources of truth

Static files in this repo. The `master` branch of `shawazi/shawaz.org` is the source of truth.

## External integrations and failure behaviour

- **GitHub Pages** serves `master` at shawaz.org (`CNAME`). If Pages fails, the site is down, and nothing else depends on it except the OAuth consent screen links (FR-3, FR-4).
- **Google Fonts:** if unreachable, system fonts are used.

## Edge cases and error handling

Unknown paths get `404.html`.

## Non-functional requirements

- Security and privacy: BR-1 and BR-4. No secrets in the repo.
- Performance: static assets only.
- Accessibility: readable at 375 px and in light and dark modes.

## Deployment and environments

Push to `master` of `shawazi/shawaz.org` over the `github.com-personal` SSH host. Pages deploys automatically.

## Open questions

- OPEN QUESTION: the local `~/code/shawaz.org` checkout is 81 commits ahead of `origin/master` with uncommitted edits (seen 2026-11-12). It is unclear whether that work is meant to ship.

## Change log

- 2026-11-12: SPEC written. Added the legal pages for the Life Ops OAuth consent screen (FR-3, FR-4, BR-4).
