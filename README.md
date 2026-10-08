# Tofutopia

Company website for **Tofutopia LLC** — data cleaning and analysis for research
partners: PhD students, labs, and research groups who have data but no dedicated
data team.

Live at [tofutopia.net](https://tofutopia.net).

---

## The site

A static, no-build four-page site. Every page shares `styles/site.css` and
carries its own copy of the header and footer markup.

| Page | File | Contents |
|---|---|---|
| Home | `index.html` | Hero, who the work is for, three service cards, closing call to action |
| Services | `services.html` | Detailed cleaning / analysis / custom blocks, plus a five-step "how we work" |
| About | `about.html` | Who runs Tofutopia and what the practice focuses on |
| Contact | `contact.html` | Email and phone, and what to include in a first message |

There is **no contact form** by design — it links to `mailto:` rather than
posting to a backend that doesn't exist.

### Design

Modern technical: white ground, hairline borders, a single indigo accent
(`#4F46E5`), Inter throughout, fluid type via `clamp()`. Headers are sticky,
one breakpoint at 560px, and `prefers-reduced-motion` is respected.

---

## Local development

No build step and no dependencies for the site itself:

```sh
npx serve .
# or open index.html with the Live Server extension
```

---

## Deployment

Vercel auto-deploys on every push to `main`. There is no build command — Vercel
serves the repo root as static files.

`vercel.json` holds the only configuration. It also **redirects a set of older,
personal routes to `/`** and marks them `noindex`, so they are not reachable or
indexed on the live domain. To bring any of them back, remove its entry from
`redirects` — the underlying files are still in the repo and keep working.

> **Note:** hiding routes here only affects the deployed website. The files
> themselves are still present in this repository, so the repository must be
> private for that material to be genuinely out of view.

---

## Contact

Arthur Yang — [arthury@tofutopia.net](mailto:arthury@tofutopia.net) · (206) 779-8895
