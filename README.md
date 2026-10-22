# TV Browser+

A [TizenBrew](https://github.com/reisxd/TizenBrew) module that makes any website usable on a Samsung Tizen TV.

- **Cursor on the TV remote:** arrows move it (it speeds up when held), OK clicks
- **Yellow** jump mode: arrows hop between links and buttons, OK opens
- **CH ▲ / CH ▼** scroll · **Back** goes back · **Red** toggles the cursor · **Green** opens the start page
- **Phone control:** scan the QR on the start page — touchpad, two-finger scroll, typing, URL bar, per-site text size

Install: TizenBrew → Module Manager → add `gh/prutxvi/tv-browser-plus`.

Phone ↔ TV traffic goes **directly over Wi-Fi via WebRTC** once the phone is paired (the relay only introduces them); it falls back to the relay if a direct link can't form. The phone shows the live delay ("Direct · 12 ms" or "Internet · 160 ms").

Some sites block extra connections with a strict Content-Security-Policy; on those the TV remote cursor still works, but phone control may not.

## Releasing
jsDelivr caches files for hours, so every release ships the script under a new name:
copy `inject.js` to `dist/inject-<version>.js`, point `main` in `package.json` at it, then tag `v<version>`.
