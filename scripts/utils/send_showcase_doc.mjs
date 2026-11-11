import http from 'http';

const content = `# 🧪 CNTXT Special Code Blocks & Rich Containers Showcase
*Tri-Platform Architecture & Visual Styling Verification Suite (v0.7.9)*

This document demonstrates and verifies all the rich container capabilities, governed code block styles, native left accent rails, theme engine compliance, and read-only lock guards implemented in CNTXT.

---

## 1. Rich Container (Markdown & Nested Visual Elements)
> **Interactive Test Instructions:**
> - **Header Hover:** Move your mouse over the header bar below. Notice how a subtle container frame and delicate background tint appear across the entire block, clearly defining its boundaries.
> - **Left Accent Rail:** Notice the continuous vertical accent line on the left. It accurately spans from the very top of the header row down to the bottom metadata rail without cutting off early.
> - **Theme Engine:** Switch themes in CNTXT (Dark, Google Material 3, GitHub Light, Parchment, etc.). The accent line, badges, and container tint adapt seamlessly.
> - **Nested Code Blocks:** Notice how the embedded Mermaid diagram block inside this container renders cleanly without breaking or prematurely terminating the container!

~~~markdown | label="System Architecture Brief" id="arch-brief" tags=["architecture","v0.7.9"] link=["#auth-module"]
### 📐 Architectural Overview

Rich Containers (\`~~~markdown |\` or \`~~~cntxt |\`) provide a seamless transparent canvas for rich, multi-tiered documents while keeping full container boundaries intact.

#### Key Verification Checkpoints
- [x] **Universal Presenter Purity**: Visual UI components consume design tokens.
- [x] **Continuous Accent Rail**: Spans accurately from start to end without virtualized height drift.
- [x] **Theme Engine Compliance**: Zero hardcoded hex colors; dynamic \`var(--accent-primary)\`.
- [ ] **Interactive Testing**: Verify collapse, lock, and copy controls.

#### System Performance Matrix
| Subsystem | Latency | Memory Footprint | Status |
| :--- | :---: | :---: | :--- |
| **REST Gateway (Port 9876)** | \`< 2ms\` | \`~12 MB\` | \`Active (LAN / RFC 1918)\` |
| **CodeMirror 6 Live Engine** | \`0ms (Sync)\` | \`~28 MB\` | \`Decorations Synchronized\` |
| **PTY Terminal Bus** | \`< 5ms\` | \`~8 MB\` | \`Gated (Experimental)\` |

#### Embedded Mermaid Diagram (Nested inside Container)
\`\`\`mermaid
flowchart TD
    Client["Client / Agent (REST Gateway)"] -->|"POST /api/v1/tabs/open"| Gateway["Rust Gateway Service (Port 9876)"]
    Gateway -->|"Token Verification (X-CNTXT-Token)"| Security["Keyring Security Guard"]
    Security -->|"Dispatch IPC RPC"| HostBus["HostCommandBus (Zod Schema Validation)"]
    HostBus -->|"Route to TabStore"| Editor["CodeMirror 6 Live Markdown"]
    Editor -->|"Render Pure Presenters"| UI["Subtle Hover Container & Accent Rail"]
\`\`\`

#### Mathematical Formulation (KaTeX)
The computational complexity of line-anchored CSS borders versus virtualized overlays:
$$O(1)_{\\text{CSS layout}} \\ll O(N)_{\\text{DOM Rect Measurement}}$$

$$\\mathcal{L}_{\\text{accent}} = \\sum_{i = \\text{start}}^{\\text{end}} \\text{LineHeight}(i)$$
~~~

---

## 2. Governed Code Block with User Lock (\`locked=user\`)
> **Interactive Test Instructions:**
> - **Read-Only Lock Guard:** Try clicking inside this Python block and typing or pressing Delete/Backspace. CodeMirror's \`codeBlockLockFilter\` will cleanly reject any modifications!
> - **Visual Accent:** Notice the solid card styling (dark background, border, padding) with an **amber left border** (\`--status-warning\`) and an amber \`user\` lock pill.
> - **Clear Protection:** Hover over the header. Notice the **Clear** button is disabled (\`opacity-50 cursor-not-allowed\`) because the block is locked.
> - **Unlock Test:** Click the amber **user** lock pill. It unlocks! You can now freely edit the code, and the Clear button becomes active. Click it again to re-lock.

\`\`\`python | locked=user label="Critical Authentication Gate" id="auth-module"
import hmac
import hashlib
from typing import Optional

def verify_gateway_token(incoming_token: str, stored_token: str) -> bool:
    """
    Validates incoming X-CNTXT-Token using constant-time comparison
    to prevent timing attacks across local network requests.
    """
    if not incoming_token or not stored_token:
        return False
    return hmac.compare_digest(
        incoming_token.encode('utf-8'),
        stored_token.encode('utf-8')
    )

class AuthContext:
    def __init__(self, token: str):
        self._token = token
        self.is_authorized = False

    def authenticate(self, request_token: str) -> bool:
        self.is_authorized = verify_gateway_token(request_token, self._token)
        return self.is_authorized
\`\`\`

---

## 3. Governed Code Block with Agent Lock (\`locked=agent\`)
> **Interactive Test Instructions:**
> - **Agent Visual Accent:** Notice the **cyan left border** (\`--status-info\`) and the cyan \`agent\` lock pill with a bot icon.
> - **Editable by User:** Blocks marked \`locked=agent\` allow user inspection and edits while visually signaling that an AI agent generated or manages this block.
> - **Cycle Lock:** Click the cyan lock pill to cycle its lock state to \`locked=user\`!

\`\`\`typescript | locked=agent label="Agent Gateway Synchronization" id="gateway-sync"
interface GatewayHeartbeat {
  endpoint: string;
  port: number;
  status: 'active' | 'degraded' | 'offline';
  timestamp: string;
}

export async function pingGateway(endpoint: string, token: string): Promise<GatewayHeartbeat> {
  const response = await fetch(\`\${endpoint}/api/v1/capabilities\`, {
    headers: {
      'X-CNTXT-Token': token,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(\`Gateway returned HTTP \${response.status}\`);
  }

  return {
    endpoint,
    port: 9876,
    status: 'active',
    timestamp: new Date().toISOString(),
  };
}
\`\`\`

---

## 4. Parameter Configurator & 3-Dot Menu Test (\`···\`)
> **Interactive Test Instructions:**
> - Click the **\`···\` (3-dots)** button in the header of the JavaScript block below.
> - Hover over the menu items. Notice how the dropdown menu stays rock-solid open without closing or vanishing!
> - Click **⚙️ Configure Parameters...** to open the live parameter popover. You can interactively modify the Block ID, Label, Tags, Links, and Lock state.
> - Test **Copy with Fences**, **Duplicate Block**, and **Toggle Word Wrap**.

\`\`\`javascript | id="calc-engine" label="Pricing Calculator"
function calculateTierPricing(users, isAnnual) {
  const baseRate = users > 50 ? 8.50 : 12.00;
  const discount = isAnnual ? 0.20 : 0.00;
  const monthlyTotal = users * baseRate * (1 - discount);
  return {
    monthlyTotal: Number(monthlyTotal.toFixed(2)),
    annualTotal: Number((monthlyTotal * 12).toFixed(2)),
    savings: Number((users * baseRate * discount * 12).toFixed(2))
  };
}
\`\`\`

---

## 5. Ordinary Code Block with Universal Controls
> **Interactive Test Instructions:**
> - Notice that even ordinary, non-governed code blocks (like the Rust snippet below) now have full universal in-context controls.
> - Hover over the header to see the **Lock** button, **Clear** button, **Copy** button, and **3-dots menu**.
> - Click the **Lock** button on this ordinary block: it instantly converts to a governed block (\`| locked=user\`) with zero boilerplate!

\`\`\`rust
pub fn process_event(event_type: &str, payload: &serde_json::Value) -> Result<(), String> {
    println!("[EVENT] Received: {} => {:?}", event_type, payload);
    // Universal lock works on standard code blocks too!
    Ok(())
}
\`\`\`

---

## 6. Collapsed Container Test
> **Interactive Test Instructions:**
> - Click the chevron button on the left of the header below to collapse and expand this container.
> - Notice the smooth state transition without any cursor jumps or layout shifts.

~~~markdown | label="Reference Notes & Shortcuts" id="ref-notes"
### ⌨️ Useful CNTXT Shortcuts
- **Ctrl + P**: Quick Open / Command Palette
- **Ctrl + S**: Save Active Document
- **Ctrl + Z / Ctrl + Y**: Undo / Redo (works with code block clear operations!)
- **Ctrl + Enter**: Execute Selected Action or Formula
- **Esc**: Dismiss active parameter popovers or dropdown menus
~~~
`;

const postData = JSON.stringify({
  title: 'Special_Code_Blocks_Showcase.cntxt',
  language: 'markdown',
  content: content,
});

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 9876,
    path: '/api/v1/tabs/open',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'X-CNTXT-Token': 'cntxt_sec_0ae9f7730f4541a2b4a24196581c4001',
    },
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log('Response status:', res.statusCode);
      console.log('Response body:', body);
    });
  }
);

req.on('error', (e) => {
  console.error('Request failed:', e.message);
});

req.write(postData);
req.end();
