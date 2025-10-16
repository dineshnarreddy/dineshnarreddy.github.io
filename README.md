# Mango Edge AI – Website (GitHub Pages)

This repository contains a simple, responsive one‑page website for the Mango Edge AI PhD project.

## How to deploy on GitHub Pages (user site)

1. Create a repository named **dineshnarreddy.github.io** (must match your GitHub username).
2. Upload `index.html` and `styles.css` to the **root** of the repo.
3. Go to **Settings → Pages** and ensure the source is **Deploy from a branch → `main` / root**.
4. The site will be live at **https://dineshnarreddy.github.io** within a minute.

## Connect a custom domain (after you claim the free .me domain)

1. In your repo **Settings → Pages**, add your domain (e.g., `dineshreddy.me`) in **Custom domain** and click **Save**.
   This will create a `CNAME` file automatically.
2. In your domain DNS, add:
   - `A` records for the apex (root) pointing to the GitHub Pages IPs (see GitHub Docs for the latest list).
   - `CNAME` for `www` pointing to `dineshnarreddy.github.io`.
3. Wait for DNS to propagate (can be up to a few hours), then verify in **Settings → Pages**.

## Editing content

- Replace the placeholder images in the **Images** section with your photos/diagrams.
- Update text in each section as your project evolves.
- If you want multi-page navigation later, add more `.html` files and link them in the nav.

---

© 2025 Mango Edge AI
