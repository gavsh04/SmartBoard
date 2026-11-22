# SmartBoard landing page

Static site: plain HTML, CSS and JavaScript. No build step and no frameworks.

```
index.html          page content
css/styles.css      design system and layout
js/config.js        the ONLY file you edit for settings
js/main.js          navigation, scroll reveal, waitlist form
assets/             icons, favicon, social preview image
robots.txt, sitemap.xml, site.webmanifest
```

Run locally: `python3 -m http.server 8000` in this folder, then open http://localhost:8000.

## Before going live

### 1. Set the domain
The domain isn't finalised. Replace `__SITE_URL__` with the live address
(for example `https://www.yourdomain.lk`, no trailing slash) in
`index.html`, `robots.txt` and `sitemap.xml`:

```
grep -rl "__SITE_URL__" . | xargs sed -i 's#__SITE_URL__#https://www.yourdomain.lk#g'
```
(On macOS use `sed -i ''`.) Host over HTTPS.

### 2. Connect the waitlist
Until `waitlistEndpoint` is set in `js/config.js`, the form checks the input
but tells visitors sign-ups aren't open, and sends nothing.

To connect it with Formspree (free tier):
1. Create a form at formspree.io with the team email.
2. Copy its endpoint, e.g. `https://formspree.io/f/abcdwxyz`.
3. Paste it into `waitlistEndpoint` in `js/config.js`.
4. Submit a test sign-up and confirm it arrives.

Any service that accepts a multipart POST and returns a 2xx status works.
The form shows success only after the service confirms it. Fields sent:
`role`, `name`, `email`, `area`, `consent`, plus `_gotcha` (spam trap).
The endpoint URL is public by design; never put API keys in this site.

### 3. Optional details
- `contactEmail` and `socials` in `js/config.js`: the footer contact block
  and the privacy notice's contact line appear only once these are set.
- Team LinkedIn: put each member's profile URL in the `data-linkedin`
  attribute on their card in `index.html`. Empty means no link is shown.
