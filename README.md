# shawaz.org

Personal portfolio and résumé for Shawaz Imam, served by GitHub Pages (custom domain in `CNAME`).

Plain HTML/CSS/JS with no build step:

- `index.html` — portfolio
- `resume.html` — printable résumé (source of `Images/Shawaz_Resume.pdf`)
- `styles/main.css`, `scripts/main.js`

Regenerate the PDF after editing `resume.html`:

```sh
chromium --headless=new --no-pdf-header-footer --print-to-pdf=Images/Shawaz_Resume.pdf resume.html
```
