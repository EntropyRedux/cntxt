# CNTXT

**A reimagining of ContextPad** — a cross-platform application (Desktop on Windows / Linux / macOS, Web, and Mobile for Android via Tauri v2) for structured writing, prompt engineering, and workflow automation.

**Status:** Production Ready (v0.6.0) — Tri-Platform Suite (Web SaaS + Native Desktop + Android Mobile), Automated Cross-Platform Android Signed APK Build Pipeline, Adaptive Launcher Icon Branding (`#141417` background), Host Command Bus & RPC Bridge (`window.CNTXT` via `postMessage`), Sandboxed Mini Panel Apps co-processor engine with path traversal guards & dirty tab mediation, Floating Pop-out Panel Apps with independent window lifecycle & compact widget resizing (down to 220x160), Hardened CSP Security Architecture, Pure Presenter Host Architecture, App Builder resilient SDK with fallback persistence, Blueprint Prompt Archetypes (`build`, `brainstorm`, `adapt`) with 2-way editor tab sync & responsive small-size modes, 14-token universal theme sync, Compact Markdown Accessory Toolbar, and Authenticode-signed packages. See [CHANGELOG.md](CHANGELOG.md) for full details.

## Downloads (v0.6.0)

### Windows
| Package | Format | Architecture | Download Link | Verification / Signature |
|:---|:---:|:---:|:---:|:---:|
| **Standard Setup** | `.exe` (NSIS) | Windows x64 | [Download CNTXT_0.6.0_x64-setup.exe](https://github.com/EntropyRedux/cntxt/releases/download/v0.6.0/CNTXT_0.6.0_x64-setup.exe) | Signed (Authenticode SHA256 + RFC 3161) |
| **Enterprise Installer** | `.msi` (WiX) | Windows x64 | [Download CNTXT_0.6.0_x64_en-US.msi](https://github.com/EntropyRedux/cntxt/releases/download/v0.6.0/CNTXT_0.6.0_x64_en-US.msi) | Signed (Authenticode SHA256 + RFC 3161) |
| **Standalone Portable** | `.exe` (Portable) | Windows x64 | [Download CNTXT_0.6.0_portable.exe](https://github.com/EntropyRedux/cntxt/releases/download/v0.6.0/CNTXT_0.6.0_portable.exe) | Standalone (Zero-install executable) |

### Android
| Package | Format | Architecture | Download Link | Verification |
|:---|:---:|:---:|:---:|:---:|
| **Android Release APK** | `.apk` | Android (arm64-v8a) | [Download cntxt-0.5.14-arm64-release-signed.apk](https://github.com/EntropyRedux/cntxt/releases/download/v0.5.14/cntxt-0.5.14-arm64-release-signed.apk) | Signed with Release Keystore / Installable via ADB |

### Linux
| Package | Format | Architecture | Download Link | Verification |
|:---|:---:|:---:|:---:|:---:|
| **Debian / Ubuntu** | `.deb` | Linux x64 | [Download cntxt_0.5.13_amd64.deb](https://github.com/EntropyRedux/cntxt/releases/download/v0.5.13/cntxt_0.5.13_amd64.deb) | Desktop entry + icons included |
| **AppImage** | `.AppImage` | Linux x64 | [Download cntxt_0.5.13_amd64.AppImage](https://github.com/EntropyRedux/cntxt/releases/download/v0.5.13/cntxt_0.5.13_amd64.AppImage) | Universal Linux portable |

---


## Key Capabilities in v0.6.0

### Large Document Virtualization (>5MB)
- **TOC-Chunked Virtual Editing**: Open multi-megabyte markdown books, transcripts, and logs without DOM freezes or memory spikes.
- **Non-Destructive Disk Splicing**: Edits to isolated sections are safely spliced into the master disk file without loading entire multi-megabyte contents into CodeMirror 6 memory.
- **Fail-Safe Recovery**: Automatic backup file creation (`.edited-chunk-recovery-<ts>.md` / `.edited-chunk-conflict-<ts>.md`) guards against external disk edits or splicing anomalies.

### Localhost REST API Gateway & Host Command Bus
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

- [Living Context Document](generated-documents/context/living_context.md) — Current sprint goals, verified architecture invariants, and component boundaries.
- [Changelog](CHANGELOG.md) — Comprehensive release history across all versions.
