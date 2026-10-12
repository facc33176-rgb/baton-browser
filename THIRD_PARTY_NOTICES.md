# Third-party notices

Baton's original integration code is licensed under Apache-2.0. Dependencies are not relicensed. Exact versions and transitive dependencies are in package-lock.json.

| Dependency | License | Role |
| --- | --- | --- |
| chrome-devtools-mcp | Apache-2.0 | Browser automation |
| @modelcontextprotocol/sdk | MIT | MCP protocol |
| Playwright | Apache-2.0 | Browser executable discovery and CDP connection |
| Express | MIT | HTTP service |
| ws | MIT | WebSocket bridge |
| noVNC | MPL-2.0, individual files may carry BSD/MIT notices | Remote desktop client |
| esbuild | MIT | Frontend bundling |

noVNC is bundled without source modifications. Its source is available at https://github.com/novnc/noVNC/tree/v1.7.0 and through the pinned npm package. See licenses/noVNC-MPL-2.0.txt. Preserve vendor notices when redistributing the browser bundle. Xvfb, x11vnc and Chromium are separately installed system/runtime software; this source archive does not distribute their binaries.
