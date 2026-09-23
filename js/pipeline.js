/* ===== pipeline.js — LOGFLUX pipeline diagram renderer ===== */

const STAGES = [
  { id: 1, label: "Capture\n& Ingest",      color: "#4a9eff", icon: "IN" },
  { id: 2, label: "Evidence\nVault",         color: "#4ade80", icon: "EV", highlight: true },
  { id: 3, label: "Telemetry\nFingerprint",  color: "#a78bfa", icon: "FP" },
  { id: 4, label: "Discovery\nEngine",       color: "#c084fc", icon: "AI" },
  { id: 5, label: "WASM/WASI\nSandbox",      color: "#60a5fa", icon: "WS" },
  { id: 6, label: "Human\nApproval Gate",    color: "#fbbf24", icon: "HG", critical: true },
  { id: 7, label: "Signed\nBundle",          color: "#4ade80", icon: "SB" },
  { id: 8, label: "Event\nSchema",           color: "#a78bfa", icon: "ES" },
  { id: 9, label: "Drift\nDetection",        color: "#f87171", icon: "DD" },
  { id: 10, label: "Provenance\nGraph",      color: "#4a9eff", icon: "PG" },
];

const STAGE_DETAILS = [
  { num: "01", title: "Capture & Ingest", tag: "Entry Point", tagClass: "", body: `<p>LOGFLUX accepts log streams from any network device via syslog (UDP/TCP), file tail, API pull, or stdin. At the moment of ingestion, the raw byte sequence is immediately forked — one copy proceeds down the processing pipeline, the other is written atomically to the Evidence Vault before any transformation occurs.</p><div class="stage-tech"><span>Python 3.12+</span><span>Syslog RFC 5424</span><span>File Tail</span><span>stdin</span></div>` },
  { num: "02", title: "Evidence Vault", tag: "Tamper-Evident", tagClass: "accent-tag", body: `<p>Every raw log entry is stored with a <strong>SHA-256 content hash</strong>. Hashes are assembled into a <strong>Merkle tree</strong> per ingestion batch, creating an append-only audit log. The Merkle root is co-signed by an <strong>Ed25519 witness quorum</strong> — multiple independent signatories must agree before a root is finalized, preventing single-point tampering. The vault is never modified after write; drift detection will flag any bit-level change.</p><div class="stage-tech"><span>SHA-256</span><span>Merkle Tree</span><span>Ed25519</span><span>SQLite</span></div>` },
  { num: "03", title: "Telemetry Fingerprint", tag: "Classification", tagClass: "", body: `<p>Incoming log lines are fingerprinted against a registry of known source types (Cisco ASA, Palo Alto, Linux syslog, Juniper, etc.). If a match is found, the corresponding signed plugin is loaded immediately. If no match is found — or if a known parser emits anomalous field rates — the log stream is flagged as <strong>Unknown</strong> and routed to the Discovery Engine.</p><div class="stage-tech"><span>Structural Heuristics</span><span>Format Registry</span><span>Prometheus Metrics</span></div>` },
  { num: "04", title: "Discovery Engine", tag: "AI-Assisted", tagClass: "ai-tag", body: `<p>Unknown log formats are analyzed by three complementary strategies running in parallel:</p><ul><li><strong>Structural (Drain3):</strong> Drain log-clustering algorithm extracts recurring templates and token positions from raw lines (Qin et al., SANER 2025 / He et al., ICWS 2017).</li><li><strong>Semantic (Local LLM):</strong> A local, air-gap-safe model (Qwen3 0.6B via llama.cpp/Ollama) proposes field names and data types from structural templates. The LLM runs entirely on-device — no data leaves the boundary.</li><li><strong>Behavioral:</strong> Statistical analysis of value distributions, cardinalities, and temporal patterns.</li></ul><p>The engine synthesizes a candidate parser (Python code) and a confidence score. It never writes anything to production.</p><div class="stage-tech"><span>Drain3</span><span>Qwen3 0.6B</span><span>llama.cpp / Ollama</span><span>Local-only LLM</span></div>` },
  { num: "05", title: "WASM/WASI Sandbox & Fuzz Testing", tag: "Deterministic Validation", tagClass: "", body: `<p>Every AI-proposed parser is compiled to <strong>WebAssembly (WASM)</strong> and executed inside a <strong>Wasmtime</strong> WASI sandbox with strictly zero host access — no filesystem, no network, no system calls. Three-phase validation gauntlet:</p><ol><li><strong>Replay Test:</strong> Parser is run against held-out real log samples from the Evidence Vault.</li><li><strong>Fuzz Test:</strong> Randomly mutated inputs are fed to detect crashes, panics, or unexpected empty outputs.</li><li><strong>Schema Conformance:</strong> All extracted fields are validated against the Universal Event Schema type definitions.</li></ol><p>Parsers that fail any phase are rejected and never reach the approval queue.</p><div class="stage-tech"><span>Wasmtime</span><span>WASI</span><span>Replay Testing</span><span>Fuzz Testing</span></div>` },
  { num: "06", title: "Human Approval Gate", tag: "⚠ Required", tagClass: "human-tag", body: `<p>Sandbox-passing parser proposals enter a <strong>mandatory review queue</strong> visible in the Parser Lab dashboard workspace. A human analyst reviews the proposed parser source code, sandbox test results, sample parsed output in a diff view, and the AI reasoning trace. The analyst may approve, reject, or edit-and-resubmit.</p><p>There is no automated bypass path. This is not a courtesy step — it is a hard architectural gate. <strong>AI proposes. Humans decide.</strong></p><div class="stage-tech"><span>Parser Lab UI</span><span>Review Queue</span><span>Audit Trail</span></div>` },
  { num: "07", title: "Signed Plugin Bundle", tag: "Deployment", tagClass: "", body: `<p>Once approved, the parser is packaged into a <strong>signed single-file plugin bundle</strong>: a WASM binary, its schema mapping, test vectors, and an Ed25519 signature from the approving analyst's key. The LOGFLUX runtime will only load bundles whose signatures verify against the trust root. Bundles are self-contained and air-gap distributable — no registry, no external dependencies, no network required at load time.</p><div class="stage-tech"><span>Ed25519 Signing</span><span>Single-file Bundle</span><span>Air-gap Safe</span></div>` },
  { num: "08", title: "Universal Event Schema", tag: "Normalization", tagClass: "", body: `<p>Parsed events are normalized into a <strong>common event schema</strong> aligned with OCSF (Open Cybersecurity Schema Framework) and ECS (Elastic Common Schema) conventions. Every normalized event carries provenance metadata: source device, plugin version used, batch Merkle root reference, and a link back to the raw evidence entry. Downstream SIEMs receive a uniform field set regardless of the originating device vendor.</p><div class="stage-tech"><span>OCSF-aligned</span><span>ECS-aligned</span><span>Provenance Metadata</span></div>` },
  { num: "09", title: "Drift Detection & Self-Healing", tag: "Resilience", tagClass: "accent-tag", body: `<p>LOGFLUX continuously monitors each active parser's output quality in production. When a firmware update changes a device's log format, field extraction rates drop measurably. The drift detector fires a Prometheus alert, automatically re-routes the affected stream to the Discovery Engine as a new "unknown" source, and keeps the last-known-good parser active for historical records while the new parser is in discovery. Parser drift never reaches your SIEM as silently malformed data.</p><div class="stage-tech"><span>Prometheus Metrics</span><span>Statistical Drift</span><span>Auto Re-routing</span></div>` },
  { num: "10", title: "Provenance Graph & Investigation", tag: "Forensics", tagClass: "", body: `<p>Every normalized event links back through a <strong>provenance graph</strong> to its raw bytes in the Evidence Vault. Investigators can trace any SIEM alert to normalized event to parser version to raw bytes, verify the Merkle proof, reconstruct the exact log line byte-for-byte, and export the full chain-of-custody report.</p><p><em>Prototype note: Graph visualization uses the Investigation workspace in the built dashboard. Production scale targets Neo4j for billion-edge graphs.</em></p><div class="stage-tech"><span>Provenance Metadata</span><span>Chain-of-Custody</span><span class="proto-tag">Prototype: SQLite</span><span class="planned-tag">Planned: Neo4j</span></div>` },
];

function buildPipelineSVG() {
  const container = document.getElementById('pipelineFull');
  if (!container) return;

  const W = 1140, ROW_H = 70, PAD = 24, BOX_W = 140, BOX_H = 54, ARROW = 28;
  const cols = 5;
  const rows = Math.ceil(STAGES.length / cols);
  const H = rows * (ROW_H + 40) + 60;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;min-width:700px;">`;
  svg += `<defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#2a2a4a"/>
    </marker>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;

  const positions = STAGES.map((s, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = PAD + col * (BOX_W + ARROW) + (row % 2 === 1 ? (cols - 1 - col * 2) * 0 : 0);
    const adjustedCol = row % 2 === 1 ? (cols - 1 - col) : col;
    return {
      x: PAD + adjustedCol * (BOX_W + ARROW),
      y: PAD + row * (BOX_H + 40) + 20,
      stage: s, idx: i
    };
  });

  // Draw connections
  for (let i = 0; i < positions.length - 1; i++) {
    const cur = positions[i];
    const next = positions[i + 1];
    const curRow = Math.floor(i / cols);
    const nextRow = Math.floor((i + 1) / cols);

    if (curRow === nextRow) {
      const x1 = cur.x + BOX_W, y = cur.y + BOX_H / 2;
      const x2 = next.x;
      svg += `<line x1="${x1}" y1="${y}" x2="${x2 - 4}" y2="${y}" stroke="#2a2a4a" stroke-width="1.5" marker-end="url(#arrow)"/>`;
    } else {
      // Turn-down connector
      const fromX = curRow % 2 === 0 ? cur.x + BOX_W : cur.x;
      const toX = nextRow % 2 === 0 ? next.x : next.x + BOX_W;
      const midY = cur.y + BOX_H + 18;
      const cornerX = curRow % 2 === 0 ? W - PAD - 8 : PAD + 8;
      svg += `<path d="M${fromX} ${cur.y + BOX_H/2} L${cornerX} ${cur.y + BOX_H/2} L${cornerX} ${midY} L${toX + (nextRow % 2 === 0 ? -4 : 4)} ${next.y + BOX_H/2}" stroke="#2a2a4a" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>`;
    }
  }

  // Draw nodes
  positions.forEach(p => {
    const s = p.stage;
    const rx = 6;
    const borderColor = s.critical ? '#fbbf24' : s.highlight ? '#4ade80' : '#1e1e35';
    const bgColor = s.critical ? 'rgba(251,191,36,0.08)' : s.highlight ? 'rgba(74,222,128,0.05)' : '#111120';
    svg += `<rect x="${p.x}" y="${p.y}" width="${BOX_W}" height="${BOX_H}" rx="${rx}" fill="${bgColor}" stroke="${borderColor}" stroke-width="${s.critical || s.highlight ? 1.5 : 1}"/>`;
    // Icon badge
    svg += `<text x="${p.x + 10}" y="${p.y + 16}" font-family="JetBrains Mono,monospace" font-size="9" fill="${s.color}" font-weight="700">${s.icon}</text>`;
    // Label (handle newline)
    const lines = s.label.split('\n');
    if (lines.length === 1) {
      svg += `<text x="${p.x + BOX_W/2}" y="${p.y + BOX_H/2 + 5}" font-family="JetBrains Mono,monospace" font-size="11" fill="#9090b0" text-anchor="middle">${lines[0]}</text>`;
    } else {
      svg += `<text x="${p.x + BOX_W/2}" y="${p.y + BOX_H/2 - 5}" font-family="JetBrains Mono,monospace" font-size="11" fill="#9090b0" text-anchor="middle">${lines[0]}</text>`;
      svg += `<text x="${p.x + BOX_W/2}" y="${p.y + BOX_H/2 + 10}" font-family="JetBrains Mono,monospace" font-size="11" fill="#9090b0" text-anchor="middle">${lines[1]}</text>`;
    }
    // Stage number
    svg += `<text x="${p.x + BOX_W - 8}" y="${p.y + 14}" font-family="JetBrains Mono,monospace" font-size="8" fill="#3a3a5a" text-anchor="end">${String(s.id).padStart(2,'0')}</text>`;
  });

  svg += '</svg>';
  container.innerHTML = svg;
}

function buildStageDetails() {
  const container = document.getElementById('stagesContainer');
  if (!container) return;

  container.innerHTML = STAGE_DETAILS.map((s, i) => `
    <div class="stage-item${s.tagClass === 'human-tag' ? ' stage-human' : ''}" data-stage="${i+1}">
      <div class="stage-header" onclick="toggleStage(this)">
        <div class="stage-num">${s.num}</div>
        <div class="stage-info">
          <h3>${s.title}</h3>
          <span class="stage-tag ${s.tagClass}">${s.tag}</span>
        </div>
        <button class="stage-toggle" aria-expanded="false">+</button>
      </div>
      <div class="stage-body">${s.body}</div>
    </div>
  `).join('');
}

function toggleStage(header) {
  const item = header.closest('.stage-item');
  const body = item.querySelector('.stage-body');
  const btn = item.querySelector('.stage-toggle');
  const isOpen = item.classList.contains('active');
  item.classList.toggle('active', !isOpen);
  body.style.display = isOpen ? 'none' : 'block';
  btn.textContent = isOpen ? '+' : '−';
  btn.setAttribute('aria-expanded', String(!isOpen));
}

window.toggleStage = toggleStage;

document.addEventListener('DOMContentLoaded', () => {
  buildPipelineSVG();
  buildStageDetails();
});