# CNTXT

**A reimagining of ContextPad** â€” a cross-platform application (Desktop on Windows / Linux / macOS, Web, and Mobile for Android via Tauri v2) for structured writing, prompt engineering, and workflow automation.

**Status:** Production Ready (v0.7.4) â€” Tri-Platform Suite (Web SaaS + Native Desktop + Android Mobile), Native Model Context Protocol (MCP) Server for external AI agents (Antigravity, Claude, Cursor, Cline, Windsurf), CNTXT Block Parser Engine & Rich Containers with continuous accent rail and floating scrollbar controls, Active Thread `.cntxt` Orchestration with top-pinned user inbox citations (`id=user-inbox`), Large Document Virtualization (>5MB) with master disk splicing, Local Network (LAN) & Localhost REST API Gateway, Automated Cross-Platform Android Signed APK Build Pipeline, and Authenticode-signed packages. See [CHANGELOG.md](CHANGELOG.md) for full details.

## Downloads (v0.7.4)

### Windows
| Package | Format | Architecture | Download Link | Verification / Signature |
|:---|:---:|:---:|:---:|:---:|
| **Standard Setup** | `.exe` (NSIS) | Windows x64 | [Download CNTXT_0.7.4_x64-setup.exe](https://github.com/EntropyRedux/cntxt/releases/download/v0.7.4/CNTXT_0.7.4_x64-setup.exe) | Signed (Authenticode SHA256 + RFC 3161) |
| **Enterprise Installer** | `.msi` (WiX) | Windows x64 | [Download CNTXT_0.7.4_x64_en-US.msi](https://github.com/EntropyRedux/cntxt/releases/download/v0.7.4/CNTXT_0.7.4_x64_en-US.msi) | Signed (Authenticode SHA256 + RFC 3161) |
| **Standalone Portable** | `.exe` (Portable) | Windows x64 | [Download CNTXT_0.7.4_portable.exe](https://github.com/EntropyRedux/cntxt/releases/download/v0.7.4/CNTXT_0.7.4_portable.exe) | Standalone (Zero-install executable) |

### Android
| Package | Format | Architecture | Download Link | Verification |
|:---|:---:|:---:|:---:|:---:|
| **Android Release APK** | `.apk` | Android (arm64-v8a) | [Download cntxt-0.7.4-arm64-release-signed.apk](https://github.com/EntropyRedux/cntxt/releases/download/v0.7.4/cntxt-0.7.4-arm64-release-signed.apk) | Signed with Release Keystore (v2 + v3) / Installable via ADB |

### Linux
| Package | Format | Architecture | Download Link | Verification |
|:---|:---:|:---:|:---:|:---:|
| **Debian / Ubuntu** | `.deb` | Linux x64 | [Download CNTXT_0.7.4_amd64.deb](https://github.com/EntropyRedux/cntxt/releases/download/v0.7.4/CNTXT_0.7.4_amd64.deb) | Desktop entry + icons included |
| **Standalone Portable** | Binary | Linux x64 | [Download CNTXT_0.7.1_portable](https://github.com/EntropyRedux/cntxt/releases/download/v0.7.1/CNTXT_0.7.1_portable) | Zero-install standalone executable |

---

## Key Capabilities in v0.7.0

### CNTXT Block Parser Engine & Rich Containers
- **Governance Primitives**: Fully parsed pipe syntax (`~~~markdown | id=... tags=... locked=... status=... link=... source=... ts=... title=...`).
- **Graph & Surgical AST Writers**: `CntxtRelationshipGraph` maps forward and reverse dependency back-links; surgical block writers (`updateBlockParams`, `updateBlockContent`, `insertBlock`, `removeBlock`, `upsertBlock`) update blocks in place while preserving document integrity and human `locked=user` guardrails.
- **Continuous Left Margin Rail & Scrollbar Controls**: Unbroken 1px accent line spanning the entire container height with viewport-aligned floating action popup for block ID copying, status cycling, lock toggling, and fast block folding.

### Native Model Context Protocol (MCP) Server & Agent Automation
- **Zero-Dependency Stdio Server**: Bridging external AI agents (`Antigravity`, `Claude Code/Desktop`, `Cursor`, `Cline`, `Windsurf`) directly into CNTXT's REST Gateway and Host Command Bus.
- **Mandatory Container Invariant**: Enforces that all agent deliverables are encapsulated in CNTXT rich containers with full inner Markdown, Mermaid diagrams, and table rendering.
- **CLI Scripting**: Standalone `send-to-cntxt.ps1` PowerShell bridge with automated port discovery and token authentication.

### Active Thread `.cntxt` Orchestration & Pinned User Inbox
- **Active Thread Tab Routing**: Right-click any tab -> "Toggle as Active Thread" to route all incoming agent deliverables directly to the top of that tab.
- **Inline Citation Reply Input (`id=user-inbox`)**: 1-click `[Respond]` button captures highlighted text and line citations (`#blockId Â· L<start>-L<end>`), automatically writing and appending user feedback into the dedicated user-owned block pinned at the very top of the document.
- **Automatic Extension Promotion**: Documents containing CNTXT pipe blocks or toggled as Active Thread automatically promote `.md` -> `.cntxt`.

### Large Document Virtualization (>5MB)
- **TOC-Chunked Virtual Editing**: Open multi-megabyte markdown books, transcripts, and logs without DOM freezes or memory spikes.
- **Non-Destructive Disk Splicing**: Edits to isolated sections are safely spliced into the master disk file without loading entire multi-megabyte contents into CodeMirror 6 memory.
- **Fail-Safe Recovery**: Automatic backup file creation (`.edited-chunk-recovery-<ts>.md` / `.edited-chunk-conflict-<ts>.md`) guards against external disk edits or splicing anomalies.

### Local Network (LAN) & Localhost REST API Gateway & Host Command Bus
- **External CLI Integration**: Headless automation bridge enabling external terminal agents (`agy`, `cline`, curl scripts) to inspect workspace state, open tabs, replace text, and execute RPC actions.
- **Security & Sandboxing**: Authenticated via constant-time `X-CNTXT-Token` verification, loopback-only Host validation (`127.0.0.1`, `localhost`, `[::1]`) guarding against DNS rebinding, and strictly loopback CORS origin controls.
- **Advanced Editor RPCs**: Multi-cursor selection controls, fold/unfold ranges, diagnostics markers, and range replacements with typed Zod boundary validation.

## Development

```bash
# Install dependencies
npm install

# Run frontend dev server
npm run dev

# Run Tauri desktop app in development
npm run tauri:dev

# Build standalone portable Windows executable
npm run build:portable

# Run tests
npm test

# Run linter
npm run lint
```

## Architecture & Documentation

- [Living Context Document](generated-documents/context/living_context.md) â€” Current sprint goals, verified architecture invariants, and component boundaries.
- [Changelog](CHANGELOG.md) â€” Comprehensive release history across all versions.

