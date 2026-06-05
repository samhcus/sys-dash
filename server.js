const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const app = express();
const port = Number(process.env.PORT || 3000);
const HISTORY_LENGTH = 60;

const sectionDefinitions = [
  {
    id: "personal",
    name: "Personal",
    items: [
      {
        id: "overseer",
        name: "Overseer",
        href: "http://<TAILSCALE_IP>:8765",
        urlLabel: "<TAILSCALE_IP>:8765",
        pingTarget: "http://<TAILSCALE_IP>:8765/health",
        tag: "vault QA + brain chat",
      },
      {
        name: "Paperclip Control Plane",
        href: "http://<TAILSCALE_IP>:3100",
        urlLabel: "<TAILSCALE_IP>:3100",
        pingTarget: "http://<TAILSCALE_IP>:3100",
        containerMatchers: [/paperclip-server/i],
      },
      {
        id: "coolify",
        name: "Coolify Control",
        href: "http://<VPS_IP>:8000",
        urlLabel: "<VPS_IP>:8000",
        pingTarget: "http://<VPS_IP>:8000",
        containerMatchers: [/^coolify$/i],
      },
      {
        id: "hostinger",
        name: "Hostinger hPanel",
        href: "https://hpanel.hostinger.com",
        urlLabel: "hpanel.hostinger.com",
      },
      {
        id: "tailscale-admin",
        name: "Tailscale Admin",
        href: "https://login.tailscale.com/admin/machines",
        urlLabel: "login.tailscale.com/admin/machines",
      },
      {
        id: "vps-ssh",
        name: "VPS SSH",
        href: "ssh://root@<VPS_IP>",
        urlLabel: "root@<VPS_IP>",
      },
    ],
    aiPortals: [
      {
        id: "mistral",
        name: "Mistral",
        href: "https://console.mistral.ai",
        urlLabel: "console.mistral.ai",
        pingTarget: "https://console.mistral.ai",
      },
      {
        id: "huggingface",
        name: "HuggingFace",
        href: "https://huggingface.co/settings/billing",
        urlLabel: "huggingface.co/settings/billing",
        pingTarget: "https://huggingface.co",
      },
      {
        id: "gemini",
        name: "Google Gemini",
        href: "https://aistudio.google.com/app/usage",
        urlLabel: "aistudio.google.com/app/usage",
        pingTarget: "https://aistudio.google.com",
      },
      {
        id: "groq-1",
        name: "Groq (Primary)",
        href: "https://console.groq.com/usage",
        urlLabel: "console.groq.com/usage",
        pingTarget: "https://console.groq.com",
      },
      {
        id: "groq-2",
        name: "Groq (Secondary)",
        href: "https://console.groq.com/usage",
        urlLabel: "console.groq.com/usage",
        pingTarget: "https://console.groq.com",
      },
      {
        id: "openrouter",
        name: "OpenRouter",
        href: "https://openrouter.ai/settings/credits",
        urlLabel: "openrouter.ai/settings/credits",
        pingTarget: "https://openrouter.ai",
      },
      {
        id: "claude",
        name: "Claude",
        href: "https://console.anthropic.com/settings/usage",
        urlLabel: "console.anthropic.com/settings/usage",
        pingTarget: "https://console.anthropic.com",
      },
      {
        id: "openai",
        name: "OpenAI",
        href: "https://platform.openai.com/usage",
        urlLabel: "platform.openai.com/usage",
        pingTarget: "https://platform.openai.com",
      },
      {
        id: "cloudflare-ai",
        name: "Cloudflare AI",
        href: "https://dash.cloudflare.com",
        urlLabel: "dash.cloudflare.com",
        pingTarget: "https://dash.cloudflare.com",
      },
      {
        id: "copilot-pro",
        name: "GitHub Copilot Pro",
        href: "https://github.com/settings/copilot",
        urlLabel: "github.com/settings/copilot",
      },
    ],
  },
  {
    id: "orinadus",
    name: "Orinadus",
    items: [
      {
        id: "orinadus-academia",
        name: "Orinadus Academia",
        href: "https://www.orinadus.com",
        urlLabel: "www.orinadus.com",
        pingTarget: "https://www.orinadus.com",
        containerMatchers: [/orinadus-waitlist/i, /orinadus/i],
      },
      {
        id: "urchin",
        name: "Urchin",
        href: "vscode://file/home/samhc/dev/orinadus/substrate/urchin-rust",
        urlLabel: "vscode://.../substrate/urchin-rust",
        tag: "Orinadus product",
        containerMatchers: [/urchin/i],
      },
      {
        id: "orinadus-workspace",
        name: "Orinadus Workspace",
        href: "vscode://file/home/samhc/dev/orinadus",
        urlLabel: "vscode://.../dev/orinadus",
      },
    ],
  },
  {
    id: "madhouse",
    name: "Mad House",
    items: [
      {
        id: "sleipnir",
        name: "Sleipnir",
        href: "vscode://file/home/samhc/dev/madhouse",
        urlLabel: "vscode://.../dev/madhouse",
        tag: "Agentic finance runtime",
        containerMatchers: [/sleipnir/i],
      },
      {
        id: "chopsticks",
        name: "Chopsticks Lean Bot",
        href: "https://github.com/madebymadhouse/chopsticks",
        urlLabel: "madebymadhouse/chopsticks",
        tag: "Discord bot",
        containerMatchers: [/bot-mof4/i],
      },
      {
        id: "hank-dashboard",
        name: "Hank Dashboard",
        href: "http://dashboard.<VPS_IP>.sslip.io",
        urlLabel: "dashboard.<VPS_IP>.sslip.io",
        pingTarget: "http://dashboard.<VPS_IP>.sslip.io",
        tag: "Hermes dashboard",
        containerMatchers: [/dashboard-gxjd/i],
      },
      {
        id: "hank-gateway",
        name: "Hank Gateway",
        href: "http://dashboard.<VPS_IP>.sslip.io",
        urlLabel: "dashboard.<VPS_IP>.sslip.io",
        tag: "Hermes gateway",
        containerMatchers: [/gateway-gxjd/i, /hank-duck-gateway/i],
        agentInfo: { provider: "GitHub Copilot", model: "gpt-5-mini", stateVolume: "gxjd7fpariwzc9za4kyx4zjv_hank-duck-data" },
      },
      {
        id: "nqita-dashboard",
        name: "Nqita Dashboard",
        href: "http://dashboard-nqita.<VPS_IP>.sslip.io",
        urlLabel: "dashboard-nqita.<VPS_IP>.sslip.io",
        pingTarget: "http://dashboard-nqita.<VPS_IP>.sslip.io",
        tag: "Hermes dashboard",
        containerMatchers: [/dashboard-vrnm/i],
      },
      {
        id: "nqita-gateway",
        name: "Nqita Gateway",
        href: "http://dashboard-nqita.<VPS_IP>.sslip.io",
        urlLabel: "dashboard-nqita.<VPS_IP>.sslip.io",
        tag: "Hermes gateway",
        containerMatchers: [/gateway-vrnm/i],
        agentInfo: { provider: "Groq", model: "llama-3.3-70b-versatile", stateVolume: "vrnm6yui1nhan1ci0pbwhtwv_nqitapa-data" },
      },
    ],
  },
];

const dockerGroupMatchers = {
  personal: [/founder-dashboard/i, /paperclip/i, /^coolify$/i, /^coolify-/i],
  orinadus: [/orinadus-waitlist/i],
  madhouse: [/bot-mof4/i, /dashboard-vrnm/i, /gateway-vrnm/i, /dashboard-gxjd/i, /gateway-gxjd/i, /hank-duck-gateway/i],
};

const EMBED_DEFS = [
  {
    id: "overseer",
    name: "Overseer",
    src: "http://<TAILSCALE_IP_2>:8765",
    height: 640,
    tag: "vault QA + brain chat",
  },
  {
    id: "hank-dashboard",
    name: "Hank",
    src: "http://dashboard.<VPS_IP>.sslip.io",
    height: 480,
    tag: "Hermes agent",
  },
  {
    id: "nqita-dashboard",
    name: "Nqita",
    src: "http://dashboard-nqita.<VPS_IP>.sslip.io",
    height: 480,
    tag: "Hermes agent",
  },
];

const allServiceDefinitions = sectionDefinitions.flatMap((section) => [
  ...(section.items || []),
  ...(section.aiPortals || []),
]);
const servicesById = new Map(allServiceDefinitions.map((service) => [service.id, service]));
const pingEnabledServices = allServiceDefinitions.filter((service) => service.pingTarget);

let previousCpuSample = null;
let latestCpuUsagePct = 0;
let latestDiskStats = {
  totalBytes: 0,
  freeBytes: 0,
  usedBytes: 0,
  usagePct: 0,
};
let latestMemoryStats = {
  totalBytes: 0,
  availableBytes: 0,
  usedBytes: 0,
  usagePct: 0,
};
let latestDocker = {
  updatedAt: null,
  totals: {
    running: 0,
    healthy: 0,
    personal: 0,
    orinadus: 0,
    madhouse: 0,
    shared: 0,
  },
  containers: [],
  groups: {
    personal: [],
    orinadus: [],
    madhouse: [],
    shared: [],
  },
};
let latestPingResults = {};
let latestPingUpdatedAt = null;

const history = {
  cpu: [],
  memory: [],
  disk: [],
  netRx: [],
  netTx: [],
};
const containerCpuHistory = new Map();
let previousNetSample = null;
let latestNetStats = { rxKbps: 0, txKbps: 0, iface: "" };
const servicePingHistory = new Map();
const SPARKLINE_LEN = 20;

function trackContainerCpu(name, cpuStr) {
  if (!cpuStr) return;
  const pct = parseFloat(cpuStr.replace("%", ""));
  if (!Number.isFinite(pct)) return;
  const hist = containerCpuHistory.get(name) || [];
  hist.push(pct);
  if (hist.length > SPARKLINE_LEN) hist.splice(0, hist.length - SPARKLINE_LEN);
  containerCpuHistory.set(name, hist);
}

let samplingSystem = false;
let samplingDocker = false;
let samplingPings = false;

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function parseBytesFromProc(valueKb) {
  return Number(valueKb) * 1024;
}

function pushHistory(series, value) {
  series.push(Number.isFinite(value) ? Number(value.toFixed(1)) : 0);
  if (series.length > HISTORY_LENGTH) {
    series.splice(0, series.length - HISTORY_LENGTH);
  }
}

function classifyContainerGroup(name) {
  for (const [group, matchers] of Object.entries(dockerGroupMatchers)) {
    if (matchers.some((matcher) => matcher.test(name))) {
      return group;
    }
  }
  return "shared";
}

function buildSectionsPayload(tailscale) {
  return sectionDefinitions.map((section) => ({
    id: section.id,
    name: section.name,
    items: (section.items || []).map(materializeService),
    aiPortals: (section.aiPortals || []).map(materializeService),
    docker: latestDocker.groups[section.id] || [],
    tailscalePeers: section.id === "personal" ? tailscale.peers : [],
  }));
}

function findContainer(matchers) {
  if (!matchers?.length) {
    return null;
  }
  return latestDocker.containers.find((container) =>
    matchers.some((matcher) => matcher.test(container.name)),
  ) || null;
}

function materializeService(service) {
  const container = findContainer(service.containerMatchers);
  const result = {
    id: service.id,
    name: service.name,
    href: service.href,
    urlLabel: service.urlLabel,
    tag: service.tag || null,
    ping: latestPingResults[service.id]
      ? { ...latestPingResults[service.id], history: servicePingHistory.get(service.id) || [] }
      : null,
    container,
    expectsContainer: Boolean(service.containerMatchers?.length),
  };
  if (service.agentInfo) {
    const liveState = latestAgentStates.get(service.id);
    result.agentInfo = {
      provider: service.agentInfo.provider,
      model: service.agentInfo.model,
      discord: liveState?.discord || null,
      gatewayState: liveState?.gatewayState || null,
      activeAgents: liveState?.activeAgents ?? null,
    };
  }
  return result;
}

async function readCpuSample() {
  const procStat = await fs.readFile("/proc/stat", "utf8");
  const cpuLine = procStat.split("\n").find((line) => line.startsWith("cpu "));
  if (!cpuLine) {
    throw new Error("cpu stats unavailable");
  }

  const values = cpuLine
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((value) => Number(value));

  const idle = values[3] + values[4];
  const total = values.reduce((sum, value) => sum + value, 0);

  return { idle, total };
}

async function sampleCpuUsage() {
  const current = await readCpuSample();
  if (previousCpuSample) {
    const deltaIdle = current.idle - previousCpuSample.idle;
    const deltaTotal = current.total - previousCpuSample.total;
    if (deltaTotal > 0) {
      latestCpuUsagePct = Number((((deltaTotal - deltaIdle) / deltaTotal) * 100).toFixed(1));
    }
  }
  previousCpuSample = current;
}

async function readMemoryStats() {
  const meminfo = await fs.readFile("/proc/meminfo", "utf8");
  const values = {};

  for (const line of meminfo.split("\n")) {
    const match = line.match(/^([^:]+):\s+(\d+)/);
    if (match) {
      values[match[1]] = Number(match[2]);
    }
  }

  const totalBytes = parseBytesFromProc(values.MemTotal || 0);
  const availableBytes = parseBytesFromProc(values.MemAvailable || 0);
  const usedBytes = totalBytes - availableBytes;
  const usagePct = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;

  return {
    totalBytes,
    availableBytes,
    usedBytes,
    usagePct,
  };
}

async function readDiskStats() {
  const stats = await fs.statfs("/");
  const blockSize = Number(stats.bsize || 0);
  const totalBytes = Number(stats.blocks || 0) * blockSize;
  const freeBytes = Number(stats.bavail || 0) * blockSize;
  const usedBytes = totalBytes - freeBytes;
  const usagePct = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;

  return {
    totalBytes,
    freeBytes,
    usedBytes,
    usagePct,
  };
}

async function sampleNetwork() {
  try {
    const content = await fs.readFile("/proc/net/dev", "utf8");
    for (const line of content.split("\n").slice(2)) {
      const parts = line.trim().split(/\s+/);
      if (!parts[0]) continue;
      const iface = parts[0].replace(":", "");
      if (iface === "lo" || iface.startsWith("docker") || iface.startsWith("veth") || iface.startsWith("br-")) continue;
      const rx = Number(parts[1]);
      const tx = Number(parts[9]);
      const ts = Date.now();
      if (previousNetSample && previousNetSample.iface === iface) {
        const dt = (ts - previousNetSample.ts) / 1000;
        if (dt > 0) {
          latestNetStats = {
            rxKbps: Math.max(0, Number((((rx - previousNetSample.rx) * 8) / dt / 1000).toFixed(1))),
            txKbps: Math.max(0, Number((((tx - previousNetSample.tx) * 8) / dt / 1000).toFixed(1))),
            iface,
          };
          pushHistory(history.netRx, latestNetStats.rxKbps);
          pushHistory(history.netTx, latestNetStats.txKbps);
        }
      }
      previousNetSample = { iface, rx, tx, ts };
      break;
    }
  } catch {
    // non-critical
  }
}

async function readLoadStats() {
  const loadavg = await fs.readFile("/proc/loadavg", "utf8");
  const [one, five, fifteen] = loadavg
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map(Number);

  return { one, five, fifteen };
}

async function readUptimeSeconds() {
  const uptime = await fs.readFile("/proc/uptime", "utf8");
  return Number(uptime.trim().split(/\s+/)[0] || 0);
}

async function readTailscaleStatus() {
  try {
    const { stdout } = await execFileAsync("tailscale", ["status", "--json"], {
      timeout: 4000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const data = JSON.parse(stdout);
    const peers = Object.values(data.Peer || {})
      .map((peer) => ({
        name: peer.HostName || "unknown",
        os: peer.OS || "unknown",
        ip: (peer.TailscaleIPs || [])[0] || "",
        online: Boolean(peer.Online),
        relay: peer.Relay || "",
      }))
      .sort((left, right) => Number(right.online) - Number(left.online) || left.name.localeCompare(right.name));

    return {
      installed: true,
      backendState: data.BackendState || "Unavailable",
      hostname: data.Self?.HostName || null,
      tailnetIp: data.TailscaleIPs?.[0] || data.Self?.TailscaleIPs?.[0] || null,
      peers,
    };
  } catch (error) {
    return {
      installed: false,
      backendState: "Unavailable",
      hostname: null,
      tailnetIp: null,
      peers: [],
      error: error.message,
    };
  }
}

function isHealthyStatus(statusCode) {
  return (
    (statusCode >= 200 && statusCode < 400) ||
    statusCode === 401 ||
    statusCode === 403
  );
}

async function pingTarget(target) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const startedAt = Date.now();

  try {
    const response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "founder-dashboard/3.0",
      },
    });

    return {
      ok: isHealthyStatus(response.status),
      latencyMs: Date.now() - startedAt,
      statusCode: response.status,
      error: null,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: null,
      statusCode: null,
      error: error.name === "AbortError" ? "timeout" : error.message || "request-failed",
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshPingResults() {
  if (samplingPings) {
    return;
  }

  samplingPings = true;
  try {
    const entries = await Promise.all(
      pingEnabledServices.map(async (service) => {
        const result = await pingTarget(service.pingTarget);
        if (result.latencyMs != null) {
          const hist = servicePingHistory.get(service.id) || [];
          hist.push(result.latencyMs);
          if (hist.length > SPARKLINE_LEN) hist.splice(0, hist.length - SPARKLINE_LEN);
          servicePingHistory.set(service.id, hist);
        }
        return [service.id, result];
      }),
    );
    latestPingResults = Object.fromEntries(entries);
    latestPingUpdatedAt = new Date().toISOString();
  } catch (error) {
    console.error("ping refresh failed:", error.message);
  } finally {
    samplingPings = false;
  }
}

function parseDockerPs(stdout) {
  const containers = new Map();

  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const [name, status, ports] = line.split("|");
    containers.set(name, {
      name,
      status: status || "",
      ports: ports || "",
      cpu: null,
      memoryUsage: null,
      group: classifyContainerGroup(name),
    });
  }

  return containers;
}

function parseDockerStats(stdout, containers) {
  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const [name, cpu, memoryUsage] = line.split("|");
    const existing = containers.get(name) || {
      name,
      status: "",
      ports: "",
      group: classifyContainerGroup(name),
    };

    trackContainerCpu(name, cpu);
    containers.set(name, {
      ...existing,
      cpu: cpu || null,
      memoryUsage: memoryUsage || null,
      cpuHistory: containerCpuHistory.get(name) || [],
    });
  }

  return containers;
}

async function refreshDockerStatus() {
  if (samplingDocker) {
    return;
  }

  samplingDocker = true;
  try {
    const [psResult, statsResult] = await Promise.all([
      execFileAsync("docker", ["ps", "--format", "{{.Names}}|{{.Status}}|{{.Ports}}"], {
        timeout: 5000,
        maxBuffer: 2 * 1024 * 1024,
      }),
      execFileAsync("docker", ["stats", "--no-stream", "--format", "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}"], {
        timeout: 5000,
        maxBuffer: 2 * 1024 * 1024,
      }),
    ]);

    const containers = parseDockerStats(
      statsResult.stdout,
      parseDockerPs(psResult.stdout),
    );

    const merged = [...containers.values()].sort((left, right) => left.name.localeCompare(right.name));
    const groups = {
      personal: [],
      orinadus: [],
      madhouse: [],
      shared: [],
    };

    for (const container of merged) {
      groups[container.group].push(container);
    }

    latestDocker = {
      updatedAt: new Date().toISOString(),
      totals: {
        running: merged.length,
        healthy: merged.filter((container) => container.status.includes("healthy")).length,
        personal: groups.personal.length,
        orinadus: groups.orinadus.length,
        madhouse: groups.madhouse.length,
        shared: groups.shared.length,
      },
      containers: merged,
      groups,
    };
  } catch (error) {
    console.error("docker refresh failed:", error.message);
  } finally {
    samplingDocker = false;
  }
}

async function sampleSystem() {
  if (samplingSystem) {
    return;
  }

  samplingSystem = true;
  try {
    await sampleCpuUsage();
    await sampleNetwork();
    latestMemoryStats = await readMemoryStats();
    latestDiskStats = await readDiskStats();
    pushHistory(history.cpu, latestCpuUsagePct);
    pushHistory(history.memory, latestMemoryStats.usagePct);
    pushHistory(history.disk, latestDiskStats.usagePct);
  } catch (error) {
    console.error("system sample failed:", error.message);
  } finally {
    samplingSystem = false;
  }
}


let latestAgentStates = new Map();
let samplingAgents = false;

async function refreshAgentStates() {
  if (samplingAgents) return;
  samplingAgents = true;
  try {
    const results = await Promise.all(AGENT_DEFS.map(readAgentGatewayState));
    for (const state of results) {
      // key by service id (hank-gateway, nqita-gateway)
      const serviceId = state.id === "hank-duck" ? "hank-gateway" : "nqita-gateway";
      latestAgentStates.set(serviceId, state);
    }
  } catch (err) {
    console.error("agent state refresh failed:", err.message);
  } finally {
    samplingAgents = false;
  }
}

// ── Agent gateway state ────────────────────────────────────────────────────

const AGENT_DEFS = [
  {
    id: "hank-duck",
    displayName: "Hank-Duck",
    container: "hank-duck-gateway",
    provider: "GitHub Copilot",
    model: "gpt-5-mini",
    stateVolume: "gxjd7fpariwzc9za4kyx4zjv_hank-duck-data",
  },
  {
    id: "nqita",
    displayName: "Nqita",
    container: "gateway-vrnm6yui1nhan1ci0pbwhtwv",
    provider: "Groq",
    model: "llama-3.3-70b-versatile",
    stateVolume: "vrnm6yui1nhan1ci0pbwhtwv_nqitapa-data",
  },
];

async function readAgentGatewayState(agentDef) {
  try {
    const { stdout } = await execFileAsync(
      "docker",
      ["exec", agentDef.container, "cat", "/opt/data/gateway_state.json"],
      { timeout: 3000 }
    );
    const state = JSON.parse(stdout.trim());
    const discord = state.platforms?.discord || {};
    const updatedAt = discord.updated_at || null;
    const staleMinutes = updatedAt
      ? Math.round((Date.now() - new Date(updatedAt).getTime()) / 60000)
      : null;
    return {
      id: agentDef.id,
      displayName: agentDef.displayName,
      provider: agentDef.provider,
      model: agentDef.model,
      discord: {
        state: discord.state || "unknown",
        error: discord.error_message || null,
        updatedAt,
        staleMinutes,
      },
      gatewayState: state.gateway_state || "unknown",
      activeAgents: state.active_agents || 0,
    };
  } catch (err) {
    return {
      id: agentDef.id,
      displayName: agentDef.displayName,
      provider: agentDef.provider,
      model: agentDef.model,
      discord: { state: "offline", error: err.message, updatedAt: null },
      gatewayState: "offline",
      activeAgents: 0,
    };
  }
}

app.get("/api/agents", async (req, res) => {
  const results = await Promise.all(AGENT_DEFS.map(readAgentGatewayState));
  res.json({ ok: true, agents: results, updatedAt: new Date().toISOString() });
});

app.get("/healthz", (req, res) => {
  res.json({ ok: true, service: "ops", ts: Date.now() });
});

app.get("/api/metrics", async (req, res) => {
  try {
    const [load, uptimeSeconds, tailscale] = await Promise.all([
      readLoadStats(),
      readUptimeSeconds(),
      readTailscaleStatus(),
    ]);
    const disk = latestDiskStats;

    res.json({
      ok: true,
      updatedAt: new Date().toISOString(),
      system: {
        cpu: {
          usagePct: latestCpuUsagePct,
          history: history.cpu,
        },
        memory: {
          ...latestMemoryStats,
          history: history.memory,
        },
        disk: { ...disk, history: history.disk },
        network: { ...latestNetStats, rxHistory: history.netRx, txHistory: history.netTx },
        load,
        uptimeSeconds,
      },
      tailscale,
      docker: latestDocker,
      embeds: EMBED_DEFS,
      sections: buildSectionsPayload(tailscale),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || "metrics-failed",
      updatedAt: new Date().toISOString(),
    });
  }
});

app.get("/api/ping/:service", async (req, res) => {
  const service = servicesById.get(req.params.service);
  if (!service?.pingTarget) {
    res.status(404).json({
      ok: false,
      error: "unknown-service",
      checkedAt: new Date().toISOString(),
    });
    return;
  }

  const result = await pingTarget(service.pingTarget);
  res.json({
    service: service.id,
    target: service.pingTarget,
    ...result,
  });
});


app.get("/favicon.svg", (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
  <rect x="4" y="4" width="10" height="11" rx="2" fill="#6366f1" opacity="0.9"/>
  <rect x="18" y="4" width="10" height="5" rx="2" fill="#a855f7" opacity="0.7"/>
  <rect x="18" y="13" width="10" height="6" rx="2" fill="#f97316" opacity="0.7"/>
  <rect x="4" y="19" width="10" height="9" rx="2" fill="#22c55e" opacity="0.6"/>
  <rect x="18" y="23" width="10" height="5" rx="2" fill="#6366f1" opacity="0.5"/>
</svg>`);
});

app.get("/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.json({
    name: "Ops",
    short_name: "Ops",
    description: "Founder ops dashboard",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "any",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  });
});

app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.send(`
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => clients.claim());
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
  `.trim());
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/sys", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

async function prime() {
  await sampleCpuUsage();
  await Promise.all([sampleSystem(), refreshDockerStatus(), refreshPingResults(), refreshAgentStates()]);
}

prime().catch((error) => {
  console.error("prime failed:", error.message);
});

setInterval(() => {
  sampleSystem();
}, 1000).unref();

setInterval(() => {
  refreshDockerStatus();
}, 5000).unref();

setInterval(() => {
  refreshPingResults();
}, 5000).unref();

setInterval(() => {
  refreshAgentStates();
}, 10000).unref();

app.listen(port, "0.0.0.0", () => {
  console.log(`ops listening on ${port}`);
});
