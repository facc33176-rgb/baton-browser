# Security boundaries

Baton controls a real browser with logged-in accounts. Deploy one instance per trusted operator. API calls require BATON_TOKEN; desktop connections require an expiring random takeover session and same-origin WebSocket requests. Only one desktop connection is accepted per session. The VNC server listens on a private Unix socket, not a public TCP port. Use HTTPS for phone access.

The current implementation is not an SSRF sandbox or multi-user isolation layer. Browser scripts and navigation can access resources reachable from the host. A takeover shares the entire desktop, not only the initially selected tab. Never add untrusted MCP callers. Tokens, profiles and actual account data are not part of the repository.

Do not publish account data or live credentials in issues. Report a reproducible issue using a disposable test environment; a private reporting channel can be enabled when a repository owner is selected.
