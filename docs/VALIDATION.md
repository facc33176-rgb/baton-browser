# Validation — 2026-10-12

Validated in an isolated temporary instance, using only a localhost fixture account. No real platform accounts, private messages or production browser profiles were used.

- 6 automated cases passed: URL validation; stop on verification; upstream format failure; minimum token strength; HTTP bearer authentication and same-origin checks; native image passthrough; reject unauthenticated desktop upgrades.
- Frontend build passed with noVNC 1.7.0, the native ESM package.
- npm audit reported zero known dependency vulnerabilities at check time after upgrading ws to 8.22.0. This is a point-in-time dependency check, not proof that all code is vulnerability-free.
- Real MCP stdio handshake, tool listing, page opening and native screenshot passed.
- A real Xvfb/x11vnc/Chromium desktop connected to the mobile takeover page; assistant calls were rejected during takeover and accepted after return. Remote keyboard input reached the fixture field.
- Rendered page reading passed. A local fixture login cookie survived shutting down and restarting Chromium.
- Mobile layout tested at 390×780 with deviceScaleFactor 2; no JS page errors or horizontal overflow. The screenshot uses only the disposable fixture.

Run `node tools/check-live.cjs` after building with an installed Chromium. Set `BATON_EXECUTABLE` to reuse an existing executable. The recorded server environment required `BATON_NO_SANDBOX=1`; this does not validate sandboxed launch on every host. The script creates and removes its own profile and only uses loopback pages. The screenshot defaults to `/tmp/baton-mobile.png`.

Not verified: real third-party account feature coverage, every MCP client, public reverse-proxy configurations, other operating systems, multi-user isolation, five/ten-minute wall-clock expiry across all browser failures. No guarantee of “any App” support. No public GitHub publication is implied by this local validation record.
