const $ = id => document.getElementById(id);

let toastTimer = null;

function toast(text, type = "ok") {
  const el = $("toast");
  if (!el) {
    console.log("[toast]", text);
    return;
  }

  clearTimeout(toastTimer);
  el.textContent = String(text || "");
  el.className = "toast " + type;

  requestAnimationFrame(() => el.classList.add("show"));

  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2600);
}

function safeBind(id, event, fn) {
  const el = $(id);
  if (!el) {
    console.warn("[bind missing]", id);
    return;
  }

  el.addEventListener(event, async e => {
    try {
      await fn(e);
    } catch (err) {
      console.error("[button error]", id, err);
      toast("按钮异常：" + id, "err");
    }
  });
}

function setStatus(text) {
  if ($("simpleStatus")) $("simpleStatus").textContent = text;
  if ($("topStatus")) $("topStatus").textContent = text;
}

async function call(name, ...args) {
  if (!window.api) {
    toast("preload 没加载：window.api 不存在", "err");
    throw new Error("window.api missing");
  }

  if (typeof window.api[name] !== "function") {
    toast("接口不存在：" + name, "err");
    throw new Error("missing api: " + name);
  }

  return await window.api[name](...args);
}

function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showPage(page) {
  document.querySelectorAll(".nav").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  ["start", "process", "install", "plugin", "log"].forEach(name => {
    const el = $(`${name}Page`);
    if (!el) return;

    if (name === page) {
      el.classList.add("active");
      el.classList.add("page-enter");
      setTimeout(() => el.classList.remove("page-enter"), 260);
    } else {
      el.classList.remove("active", "page-enter");
    }
  });

  if (page === "process") refreshProcess();
  if (page === "plugin") refreshPlugins();
  if (page === "log") refreshLog();
}

async function refreshStatus() {
  setStatus("正在检查");

  try {
    const res = await call("systemStatus");

    setStatus(res.qqCount > 0 ? `运行中：${res.qqCount} 个` : "未启动");

    const info = $("systemInfo");
    if (info) {
      info.innerHTML = `
        <div>用户：${esc(res.user)}</div>
        <div>linuxqq 命令：${res.hasLinuxQQCommand ? "存在" : "不存在"}</div>
        <div>/opt/QQ/qq：${res.hasOptQQ ? "存在" : "不存在"}</div>
        <div>LiteLoader：${res.hasLiteLoaderDir ? "存在" : "不存在"}</div>
        <div>插件数量：${res.pluginCount}</div>
        <div>插件目录：${esc(res.pluginDir)}</div>
      `;
    }
  } catch (err) {
    setStatus("检查失败");
  }
}

async function startQQ() {
  setStatus("正在启动");

  try {
    const res = await call("qqStart");
    toast(res.message || "QQ 启动完成", res.ok ? "ok" : "err");
    setStatus(res.ok ? "已启动" : "启动失败");
    setTimeout(refreshStatus, 900);
  } catch {
    setStatus("启动失败");
  }
}

async function killAllQQ() {
  setStatus("正在结束");

  try {
    const res = await call("qqKillAll");
    toast(res.message || "操作完成", res.ok ? "ok" : "err");
    await refreshProcess();
    await refreshStatus();
  } catch {
    toast("结束失败", "err");
  }
}

async function refreshProcess() {
  const list = $("processList");
  if (!list) return;

  list.innerHTML = `<div class="empty">正在读取...</div>`;

  try {
    const res = await call("qqList");

    if (!res.ok || !res.processes || res.processes.length === 0) {
      list.innerHTML = `<div class="empty">暂无 QQ 进程</div>`;
      setStatus("未启动");
      return;
    }

    setStatus(`运行中：${res.count} 个`);

    list.innerHTML = `
      <div class="process-row header">
        <div>PID</div>
        <div>用户</div>
        <div>QQ号</div>
        <div>子进程</div>
        <div>命令</div>
        <div>操作</div>
      </div>
      ${res.processes.map(proc => `
        <div class="process-row">
          <div>${proc.pid}</div>
          <div>${proc.isRoot ? "root" : esc(proc.user)}</div>
          <div>${esc(proc.account)}</div>
          <div>${proc.childCount ?? 0}</div>
          <div class="cmd" title="${esc(proc.command)}">${esc(proc.command)}</div>
          <button data-pid="${proc.pid}" class="kill-one">${proc.isRoot ? "授权结束" : "结束"}</button>
        </div>
      `).join("")}
    `;

    document.querySelectorAll(".kill-one").forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.dataset.pid;
        const r = await call("qqKillOne", pid);
        toast(r.message || "操作完成", r.ok ? "ok" : "err");
        await refreshProcess();
        await refreshStatus();
      };
    });
  } catch {
    list.innerHTML = `<div class="empty">读取失败</div>`;
  }
}

async function installQQ() {
  const pkg = $("qqPackage")?.value || "linuxqq";
  const r = await call("installQQ", pkg);
  toast(r.message || "操作完成", r.ok ? "ok" : "err");
}

async function removeQQ() {
  const pkg = $("qqPackage")?.value || "linuxqq";
  const r = await call("removeQQ", pkg);
  toast(r.message || "操作完成", r.ok ? "ok" : "err");
  await refreshStatus();
}

async function installLiteLoader() {
  const r = await call("installLiteLoader");
  toast(r.message || "操作完成", r.ok ? "ok" : "err");
}

async function removeLiteLoader() {
  const removeData = Boolean($("removeLLData")?.checked);
  const r = await call("removeLiteLoader", removeData);
  toast(r.message || "操作完成", r.ok ? "ok" : "err");
  await refreshStatus();
}

async function fixLiteLoaderPath() {
  const r = await call("fixLiteLoaderPath");
  toast(r.message || "操作完成", r.ok ? "ok" : "err");
}

async function refreshPlugins() {
  const list = $("pluginList");
  const catalog = $("catalogList");

  try {
    const installed = await call("pluginList");
    const cat = await call("pluginCatalog");

    if (list) {
      if (!installed.ok || !installed.plugins || installed.plugins.length === 0) {
        list.innerHTML = `<div class="empty">暂无插件</div>`;
      } else {
        list.innerHTML = installed.plugins.map(p => `
          <div class="plugin-row">
            <div>
              <div>${esc(p.name)}</div>
              <div class="plugin-meta">${esc(p.dir)} · ${esc(p.version)} · ${esc(p.slug)}</div>
            </div>
            <button data-dir="${esc(p.dir)}" class="remove-plugin">删除</button>
          </div>
        `).join("");

        document.querySelectorAll(".remove-plugin").forEach(btn => {
          btn.onclick = async () => {
            const r = await call("pluginRemove", btn.dataset.dir);
            toast(r.message || "操作完成", r.ok ? "ok" : "err");
            await refreshPlugins();
          };
        });
      }
    }

    if (catalog && cat.ok && cat.catalog) {
      catalog.innerHTML = Object.entries(cat.catalog).map(([key, p]) => `
        <div class="catalog-row">
          <div>
            <div>${esc(p.name)}</div>
            <div class="plugin-meta">${esc(p.repo)}</div>
          </div>
          <button data-key="${esc(key)}" class="install-plugin">安装</button>
        </div>
      `).join("");

      document.querySelectorAll(".install-plugin").forEach(btn => {
        btn.onclick = async () => {
          const r = await call("pluginInstall", btn.dataset.key);
          toast(r.message || "操作完成", r.ok ? "ok" : "err");
          await refreshPlugins();
        };
      });
    }
  } catch (err) {
    console.error(err);
    toast("插件读取失败", "err");
  }
}

async function installCustomPlugin() {
  const repo = $("customRepo")?.value || "";
  const r = await call("pluginInstallCustom", repo);
  toast(r.message || "操作完成", r.ok ? "ok" : "err");
  await refreshPlugins();
}

async function refreshLog() {
  const log = $("logView");
  if (!log) return;

  try {
    log.textContent = await call("logRead");
    log.scrollTop = log.scrollHeight;
  } catch {
    log.textContent = "日志读取失败";
  }
}

async function clearLog() {
  await call("logClear");
  await refreshLog();
  toast("日志已清空", "ok");
}

function stripAnsi(text) {
  return String(text)
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1B\][^\x07]*(\x07|\x1B\\)/g, "");
}

function terminalAppend(text) {
  const out = $("terminalOutput");
  if (!out) return;

  if ("value" in out) {
    if (out.value === "等待任务...") out.value = "";
    out.value += stripAnsi(text);
    out.scrollTop = out.scrollHeight;
  } else {
    if (out.textContent === "等待任务...") out.textContent = "";
    out.textContent += stripAnsi(text);
    out.scrollTop = out.scrollHeight;
  }
}

function terminalClear() {
  const out = $("terminalOutput");
  if (!out) return;

  if ("value" in out) out.value = "";
  else out.textContent = "";
}

async function terminalSendInput() {
  const input = $("terminalInput");
  if (!input) return;

  const value = input.value;
  input.value = "";

  const r = await call("terminalInput", value + "\n");

  if (!r.ok) {
    toast(r.message || "没有正在运行的终端任务", "err");
  }
}

function initInternalTerminal() {
  if (!window.api) return;

  if (typeof window.api.onTerminalData === "function") {
    window.api.onTerminalData(data => terminalAppend(data));
  }

  if (typeof window.api.onTerminalClear === "function") {
    window.api.onTerminalClear(() => terminalClear());
  }

  if (typeof window.api.onTerminalExit === "function") {
    window.api.onTerminalExit(data => {
      terminalAppend(`\n[终端任务结束] ${data && data.ok ? "成功" : "失败"}\n`);
    });
  }

  safeBind("terminalSend", "click", terminalSendInput);

  const input = $("terminalInput");
  if (input) {
    input.onkeydown = event => {
      if (event.key === "Enter") {
        event.preventDefault();
        terminalSendInput();
      }
    };
  }

  safeBind("terminalClear", "click", terminalClear);

  safeBind("terminalStop", "click", async () => {
    const r = await call("terminalStop");
    toast(r.message || "已请求停止", r.ok ? "ok" : "err");
  });
}

function hexToRgb(hex) {
  const v = String(hex || "#202020").replace("#", "");
  const n = parseInt(v, 16);

  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

function rgbToHex({ r, g, b }) {
  const h = n => Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");

  return `#${h(r)}${h(g)}${h(b)}`;
}

function mix(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

function luminance(c) {
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
}

function changeTheme(hex) {
  const base = hexToRgb(hex);
  const dark = { r: 0, g: 0, b: 0 };
  const light = { r: 255, g: 255, b: 255 };
  const lum = luminance(base);

  const vars = {
    "--base": hex,
    "--bg": rgbToHex(mix(base, dark, 0.44)),
    "--titlebar": rgbToHex(mix(base, dark, 0.28)),
    "--sidebar": rgbToHex(mix(base, dark, 0.36)),
    "--panel": rgbToHex(mix(base, dark, 0.31)),
    "--card": rgbToHex(mix(base, dark, 0.47)),
    "--button": rgbToHex(mix(base, lum > 0.55 ? dark : light, lum > 0.55 ? 0.18 : 0.08)),
    "--button-hover": rgbToHex(mix(base, lum > 0.55 ? dark : light, lum > 0.55 ? 0.08 : 0.16)),
    "--line": rgbToHex(mix(base, lum > 0.55 ? dark : light, lum > 0.55 ? 0.36 : 0.20)),
    "--line-soft": rgbToHex(mix(base, dark, 0.22)),
    "--text": lum > 0.55 ? "#111111" : "#eeeeee",
    "--muted": lum > 0.55 ? "#3d3d3d" : "#b8b8b8",
    "--accent": rgbToHex(mix(base, lum > 0.55 ? dark : light, lum > 0.55 ? 0.24 : 0.28))
  };

  for (const [k, v] of Object.entries(vars)) {
    document.documentElement.style.setProperty(k, v);
  }

  localStorage.setItem("themeColor", hex);
}

function bindStaticEvents() {
  document.querySelectorAll(".nav").forEach(btn => {
    btn.onclick = () => showPage(btn.dataset.page);
  });

  safeBind("minBtn", "click", () => call("winMin"));
  safeBind("maxBtn", "click", () => call("winMax"));
  safeBind("closeBtn", "click", () => call("winClose"));

  safeBind("refreshStatus", "click", refreshStatus);
  safeBind("startQQ", "click", startQQ);
  safeBind("killAllQQ", "click", killAllQQ);
  safeBind("killAllQQ2", "click", killAllQQ);
  safeBind("refreshProcess", "click", refreshProcess);

  safeBind("installQQ", "click", installQQ);
  safeBind("removeQQ", "click", removeQQ);
  safeBind("installLL", "click", installLiteLoader);
  safeBind("removeLL", "click", removeLiteLoader);
  safeBind("fixLLPath", "click", fixLiteLoaderPath);

  safeBind("refreshPlugins", "click", refreshPlugins);
  safeBind("installCustomPlugin", "click", installCustomPlugin);

  safeBind("refreshLog", "click", refreshLog);
  safeBind("clearLog", "click", clearLog);

  const theme = $("themeColor");
  if (theme) {
    theme.oninput = e => changeTheme(e.target.value);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("[renderer] loaded");

  bindStaticEvents();
  initInternalTerminal();

  const saved = localStorage.getItem("themeColor") || "#202020";
  if ($("themeColor")) $("themeColor").value = saved;
  changeTheme(saved);

  refreshStatus();
});


function forceBindTerminalInput() {
  const input = document.getElementById("terminalInput");
  const send = document.getElementById("terminalSend");
  const clear = document.getElementById("terminalClear");
  const stop = document.getElementById("terminalStop");
  const card = document.querySelector(".terminal-card");

  if (!input) {
    console.warn("[terminal] terminalInput not found");
    return;
  }

  input.disabled = false;
  input.readOnly = false;
  input.removeAttribute("disabled");
  input.removeAttribute("readonly");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");

  async function sendInputLine() {
    const text = input.value;
    input.value = "";

    try {
      const res = await window.api.terminalInput(text + "\n");
      if (!res.ok) toast(res.message || "没有正在运行的终端任务", "err");
    } catch (e) {
      toast("终端输入发送失败", "err");
      console.error(e);
    }

    input.focus();
  }

  input.onkeydown = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendInputLine();
    }
  };

  if (send) {
    send.onclick = sendInputLine;
  }

  if (clear) {
    clear.onclick = () => {
      const out = document.getElementById("terminalOutput");
      if (!out) return;
      if ("value" in out) out.value = "";
      else out.textContent = "";
      input.focus();
    };
  }

  if (stop) {
    stop.onclick = async () => {
      try {
        const res = await window.api.terminalStop();
        toast(res.message || "已请求停止", res.ok ? "ok" : "err");
      } catch {
        toast("停止失败", "err");
      }
      input.focus();
    };
  }

  if (card) {
    card.onclick = () => input.focus();
  }

  setTimeout(() => input.focus(), 300);
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(forceBindTerminalInput, 300);
});


function injectRepairPluginActivationButton() {
  if (document.getElementById("repairPluginActivationBtn")) return;

  const btn = document.createElement("button");
  btn.id = "repairPluginActivationBtn";
  btn.className = "btn danger";
  btn.textContent = "一键修复插件激活";

  btn.onclick = async () => {
    try {
      if (!window.api?.repairPluginActivation) {
        toast("preload 未暴露 repairPluginActivation", "err");
        return;
      }

      const res = await window.api.repairPluginActivation();
      toast(res?.message || "已启动插件激活修复", res?.ok === false ? "err" : "ok");
    } catch (e) {
      console.error(e);
      toast("启动插件激活修复失败", "err");
    }
  };

  const host =
    document.querySelector("#plugins .toolbar") ||
    document.querySelector("#plugins .actions") ||
    document.querySelector(".plugin-actions") ||
    document.querySelector(".toolbar") ||
    document.querySelector(".content") ||
    document.body;

  host.appendChild(btn);
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(injectRepairPluginActivationButton, 500);
});


document.addEventListener("copy", e => {
  const allow = e.target.closest?.(
    "#terminalOutput, #terminalInput, .terminal-output, .terminal-input, .terminal-card, .log-output, .logs, #logs, #logOutput, textarea"
  );

  if (!allow) {
    e.preventDefault();
    return false;
  }
}, true);
