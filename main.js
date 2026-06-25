const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const { spawn, execFile, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const HOME = os.homedir();
const USER = os.userInfo().username;
const LL_HOME = path.join(HOME, "LiteLoaderQQNT");
const PLUGIN_DIR = path.join(LL_HOME, "plugins");
const LOG_FILE = "/tmp/qq-control-center-arch.log";

let win;


let terminalChild = null;
Menu.setApplicationMenu(null);

const PLUGIN_CATALOG = {
  anti_recall: {
    name: "防撤回",
    dir: "LiteLoaderQQNT-Anti-Recall",
    repo: "https://github.com/xh321/LiteLoaderQQNT-Anti-Recall.git"
  },
  sidebar_simplify: {
    name: "边栏精简",
    dir: "LL-Sidebar-Simplify",
    repo: "https://github.com/CarlGao4/LL-Sidebar-Simplify.git"
  },
  no_tips: {
    name: "去提示",
    dir: "QQNTnoTips",
    repo: "https://github.com/LateDreamXD/QQNTnoTips.git"
  },
  window_on_top: {
    name: "窗口置顶",
    dir: "window-on-top",
    repo: "https://github.com/mo-jinran/window-on-top.git"
  }
};

function log(text) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toLocaleString()}] ${String(text).trim()}\n`);
}

function run(cmd, args = [], options = {}) {
  return new Promise(resolve => {
    execFile(cmd, args, { encoding: "utf8", ...options }, (error, stdout = "", stderr = "") => {
      resolve({
        ok: !error,
        stdout,
        stderr,
        error: error ? error.message : ""
      });
    });
  });
}

function commandExists(cmd) {
  return spawnSync("bash", ["-lc", `command -v '${cmd}' >/dev/null 2>&1`]).status === 0;
}

function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}


function terminalSend(channel, data) {
  if (win && win.webContents) {
    win.webContents.send(channel, data);
  }
}


function terminalSend(channel, data) {
  if (win && win.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}


function terminalSend(channel, data) {
  if (win && win.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function openTerminal(command, title) {
  if (terminalChild) {
    return {
      ok: false,
      message: "已有终端任务正在运行"
    };
  }

  const script = `
echo "[${title}]"
echo
${command}
code=$?
echo
echo "[任务结束] exit code: $code"
exit "$code"
`;

  terminalSend("terminal:clear", "");
  terminalSend("terminal:data", `[启动任务] ${title}\n\n`);

  const env = {
    ...process.env,
    HOME,
    USER,
    LOGNAME: USER,
    LITELOADERQQNT_PROFILE: LL_HOME,
    TERM: "xterm-256color"
  };

  if (commandExists("script")) {
    terminalChild = spawn("script", [
      "-q",
      "-f",
      "-e",
      "-c",
      `bash -lc ${shellQuote(script)}`,
      "/dev/null"
    ], {
      cwd: HOME,
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
  } else {
    terminalChild = spawn("bash", ["-lc", script], {
      cwd: HOME,
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
  }

  terminalChild.stdout.on("data", data => {
    terminalSend("terminal:data", data.toString());
  });

  terminalChild.stderr.on("data", data => {
    terminalSend("terminal:data", data.toString());
  });

  terminalChild.on("error", err => {
    terminalSend("terminal:data", `\n[启动失败] ${err.message}\n`);
    terminalSend("terminal:exit", { ok: false, message: err.message });
    terminalChild = null;
  });

  terminalChild.on("close", code => {
    terminalSend("terminal:data", `\n[进程退出] ${code}\n`);
    terminalSend("terminal:exit", { ok: code === 0, code });
    terminalChild = null;
  });

  return {
    ok: true,
    message: "已在内置终端执行任务"
  };
}

function aurInstallCommand(packages) {
  const pkgList = packages.map(shellQuote).join(" ");

  return `
set -e
echo "[INFO] 安装：${packages.join(" ")}"
if command -v yay >/dev/null 2>&1; then
  yay -S --needed ${pkgList}
elif command -v paru >/dev/null 2>&1; then
  paru -S --needed ${pkgList}
else
  sudo pacman -S --needed git base-devel
  mkdir -p "$HOME/.cache/qq-control-center-arch/aur"
  cd "$HOME/.cache/qq-control-center-arch/aur"
  for pkg in ${pkgList}; do
    rm -rf "$pkg"
    git clone "https://aur.archlinux.org/$pkg.git"
    cd "$pkg"
    makepkg -si
    cd ..
  done
fi
`;
}

function createWindow() {
  win = new BrowserWindow({
icon: path.join(__dirname, "assets", "icon.png"),
    width: 980,
    height: 720,
    minWidth: 860,
    minHeight: 600,
    title: "QQ Control Center Arch",
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#151515",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true
    }
  });

  win.loadFile("index.html");
}

function parseQQAccount(cmd) {
  const m = cmd.match(/(?:^|\s)-q\s+([0-9]{5,15})(?:\s|$)/);
  return m ? m[1] : "未知";
}

async function processTable() {
  const res = await run("ps", ["-eo", "pid=,ppid=,user:32=,args="]);

  return res.stdout.split("\n").map(x => x.trim()).filter(Boolean).map(line => {
    const m = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
    if (!m) return null;
    return {
      pid: Number(m[1]),
      ppid: Number(m[2]),
      user: m[3],
      command: m[4]
    };
  }).filter(Boolean);
}

function descendantsOf(all, rootPid) {
  const out = [];
  const queue = [rootPid];

  while (queue.length) {
    const current = queue.shift();
    for (const p of all) {
      if (p.ppid === current) {
        out.push(p.pid);
        queue.push(p.pid);
      }
    }
  }

  return out;
}

async function qqInstances() {
  const all = await processTable();

  const mains = all.filter(p => {
    const cmd = p.command;
    return cmd.includes("/opt/QQ/qq") &&
      !cmd.includes("--type=") &&
      !cmd.includes("/proc/self/exe") &&
      !cmd.includes("qq-control-center");
  });

  return mains.map(p => {
    const children = descendantsOf(all, p.pid);
    return {
      pid: p.pid,
      user: p.user,
      account: parseQQAccount(p.command),
      childCount: children.length,
      treePids: [p.pid, ...children],
      command: p.command,
      isRoot: p.user === "root" || p.user !== USER
    };
  });
}

async function killPids(pids, root) {
  const safe = pids.map(Number).filter(x => Number.isInteger(x) && x > 0).map(String);
  if (!safe.length) return { ok: false, message: "没有 PID" };

  const res = root
    ? await run("pkexec", ["kill", "-9", ...safe])
    : await run("kill", ["-9", ...safe]);

  return {
    ok: res.ok,
    message: res.ok ? "已结束" : "结束失败",
    detail: res.stderr || res.error
  };
}

function pluginTarget(dir) {
  const base = path.resolve(PLUGIN_DIR);
  const target = path.resolve(path.join(PLUGIN_DIR, dir));
  if (!target.startsWith(base + path.sep)) throw new Error("非法插件路径");
  return target;
}

async function listPlugins() {
  if (!fs.existsSync(PLUGIN_DIR)) return [];

  return fs.readdirSync(PLUGIN_DIR, { withFileTypes: true }).filter(x => x.isDirectory()).map(d => {
    const manifest = path.join(PLUGIN_DIR, d.name, "manifest.json");
    let name = d.name;
    let version = "-";
    let slug = "-";

    if (fs.existsSync(manifest)) {
      try {
        const data = JSON.parse(fs.readFileSync(manifest, "utf8"));
        name = data.name || name;
        version = data.version || version;
        slug = data.slug || slug;
      } catch {}
    }

    return { dir: d.name, name, version, slug };
  });
}


ipcMain.handle("window:minimize", async () => {
  if (win) win.minimize();
});

ipcMain.handle("window:maximize", async () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.handle("window:close", async () => {
  if (win) win.close();
});


ipcMain.handle("terminal:input", async (_, text) => {
  if (!terminalChild || !terminalChild.stdin || terminalChild.stdin.destroyed) {
    return {
      ok: false,
      message: "没有正在运行的终端任务"
    };
  }

  terminalChild.stdin.write(String(text));
  return {
    ok: true,
    message: "已发送"
  };
});

ipcMain.handle("terminal:stop", async () => {
  if (!terminalChild) {
    return {
      ok: false,
      message: "没有正在运行的终端任务"
    };
  }

  try {
    terminalChild.stdin.write("\x03");
  } catch {}

  setTimeout(() => {
    try {
      if (terminalChild) terminalChild.kill("SIGTERM");
    } catch {}
  }, 350);

  return {
    ok: true,
    message: "已请求停止"
  };
});

ipcMain.handle("system:status", async () => {
  const q = await qqInstances();

  return {
    user: USER,
    home: HOME,
    hasLinuxQQCommand: commandExists("linuxqq"),
    hasOptQQ: fs.existsSync("/opt/QQ/qq"),
    hasLiteLoaderDir: fs.existsSync(LL_HOME),
    pluginDir: PLUGIN_DIR,
    pluginCount: (await listPlugins()).length,
    qqCount: q.length
  };
});

ipcMain.handle("qq:start", async () => {
  const env = {
    ...process.env,
    HOME,
    USER,
    LOGNAME: USER,
    LITELOADERQQNT_PROFILE: LL_HOME
  };

  const child = spawn("/bin/bash", ["-ic", "linuxqq"], {
    cwd: HOME,
    env,
    detached: true,
    stdio: ["ignore", "ignore", "pipe"]
  });

  child.stderr.on("data", data => {
    log(data.toString());
  });

  child.on("error", err => {
    log("启动失败：" + err.message);
  });

  child.unref();

  log("启动 QQ：bash -ic linuxqq");

  return {
    ok: true,
    message: "QQ 启动成功"
  };
});

ipcMain.handle("qq:list", async () => {
  const list = await qqInstances();
  return { ok: true, count: list.length, processes: list };
});

ipcMain.handle("qq:kill-one", async (_, pid) => {
  const list = await qqInstances();
  const target = list.find(x => x.pid === Number(pid));
  if (!target) return { ok: false, message: "进程不存在" };

  const res = await killPids(target.treePids, target.isRoot);
  log(`结束 QQ PID=${target.pid} ROOT=${target.isRoot} OK=${res.ok}`);
  return { ok: res.ok, message: res.ok ? `已结束 QQ：${target.account}` : res.message, detail: res.detail };
});

ipcMain.handle("qq:kill-all", async () => {
  const list = await qqInstances();
  if (!list.length) return { ok: true, message: "没有 QQ 进程" };

  for (const item of list) {
    await killPids(item.treePids, item.isRoot);
  }

  log(`结束全部 QQ：${list.length}`);
  return { ok: true, message: `已结束 ${list.length} 个 QQ 实例` };
});

ipcMain.handle("pkg:install-qq", async (_, pkg, terminalConfig = {}) => {
  const allowed = ["linuxqq", "linuxqq-nt", "linuxqq-nt-bwrap"];
  if (!allowed.includes(pkg)) return { ok: false, message: "包名不允许" };

  return openTerminal(aurInstallCommand([pkg]), `安装 ${pkg}`, terminalConfig);
});

ipcMain.handle("pkg:remove-qq", async (_, pkg) => {
  const allowed = ["linuxqq", "linuxqq-nt", "linuxqq-nt-bwrap"];
  if (!allowed.includes(pkg)) {
    return {
      ok: false,
      message: "包名不允许"
    };
  }

  return openTerminal(
    `sudo pacman -Rns --noconfirm ${shellQuote(pkg)}`,
    `卸载 ${pkg}`
  );
});


function liteLoaderZipInstallCommand() {
  return `
set -e

LL="$HOME/LiteLoaderQQNT"
CFG="$HOME/.config/LiteLoaderQQNT"
PLUG="$CFG/plugins"
CACHE="$HOME/.cache/qq-control-center-arch/liteloader"
ZIP="$CACHE/LiteLoaderQQNT.zip"
EXTRACT="$CACHE/extract"
URL="https://github.com/LiteLoaderQQNT/LiteLoaderQQNT/releases/latest/download/LiteLoaderQQNT.zip"

echo "[ZIP] 准备目录..."
mkdir -p "$CACHE" "$LL" "$PLUG"
rm -rf "$EXTRACT"
mkdir -p "$EXTRACT"

echo
echo "[ZIP] 下载 LiteLoaderQQNT.zip..."
DOWNLOAD_OK=0

if command -v curl >/dev/null 2>&1; then
  curl -L --fail -o "$ZIP" "$URL" && DOWNLOAD_OK=1 || true
elif command -v wget >/dev/null 2>&1; then
  wget -O "$ZIP" "$URL" && DOWNLOAD_OK=1 || true
else
  echo "没有 curl/wget，尝试使用本地缓存。"
fi

if [ "$DOWNLOAD_OK" != "1" ]; then
  echo
  echo "[ZIP] 在线下载失败，查找本地 zip 缓存..."
  CACHE_ZIP="$(find "$HOME/.cache/yay" "$HOME/.cache/paru" "$HOME" -maxdepth 6 -type f -name 'LiteLoaderQQNT*.zip' 2>/dev/null | head -n1 || true)"

  if [ -n "$CACHE_ZIP" ] && [ -f "$CACHE_ZIP" ]; then
    echo "使用缓存：$CACHE_ZIP"
    cp "$CACHE_ZIP" "$ZIP"
    DOWNLOAD_OK=1
  fi
fi

if [ "$DOWNLOAD_OK" != "1" ] || [ ! -s "$ZIP" ]; then
  echo "错误：没有拿到 LiteLoaderQQNT.zip"
  echo "请检查网络，或确认 ~/.cache/yay / ~/.cache/paru 里有 LiteLoaderQQNT zip 缓存。"
  exit 1
fi

echo
echo "[ZIP] 解压..."
python - "$ZIP" "$EXTRACT" <<'PYZIP'
import sys
import zipfile
from pathlib import Path

zip_path = Path(sys.argv[1])
out = Path(sys.argv[2])

with zipfile.ZipFile(zip_path) as z:
    z.extractall(out)

print("extracted:", out)
PYZIP

SRC="$(find "$EXTRACT" -maxdepth 4 -type f -name package.json -not -path '*/node_modules/*' | head -n1 | xargs -r dirname)"

if [ -z "$SRC" ] || [ ! -f "$SRC/package.json" ]; then
  echo "错误：zip 解压后找不到 LiteLoader package.json"
  find "$EXTRACT" -maxdepth 4 -type f | head -80
  exit 1
fi

echo "LiteLoader source: $SRC"

echo
echo "[ZIP] 迁移旧插件..."
if [ -d "$LL/plugins" ] && [ ! -L "$LL/plugins" ]; then
  cp -an "$LL/plugins"/. "$PLUG"/ 2>/dev/null || true
fi

echo
echo "[ZIP] 清理旧本体，保留插件数据..."
find "$LL" -mindepth 1 -maxdepth 1 ! -name plugins -exec rm -rf {} +

echo
echo "[ZIP] 复制 LiteLoader 本体..."
cp -a "$SRC"/. "$LL"/

echo
echo "[ZIP] 修复插件目录软链接..."
rm -rf "$LL/plugins"
ln -sT "$PLUG" "$LL/plugins"

echo
echo "[ZIP] 检查 LiteLoader 本体..."
ls -la "$LL" | head -40

if [ ! -f "$LL/package.json" ]; then
  echo "错误：$LL/package.json 不存在"
  exit 1
fi

echo
echo "LiteLoader ZIP 安装完成。"
`;
}

ipcMain.handle("pkg:install-liteloader", async () => {
  const cmd = `
set -e

echo "[阶段 1] 使用 ZIP 安装 LiteLoader..."
${liteLoaderZipInstallCommand()}

echo
echo "[阶段 2] 自动修复 LiteLoader 注入..."
${liteLoaderRepairCommand()}
`;

  return openTerminal(cmd, "ZIP 安装并修复 LiteLoader");
});

ipcMain.handle("pkg:remove-liteloader", async (_, removeData) => {
  const removeDataFlag = removeData ? "1" : "0";

  const cmd = `
set +e

REMOVE_DATA="${removeDataFlag}"
APP="/opt/QQ/resources/app"
PKG="$APP/package.json"

echo "[1/5] 卸载 pacman/AUR 包..."
PKGS="$(pacman -Qq liteloader-qqnt-bin liteloader-qqnt-patcher 2>/dev/null | tr '\n' ' ')"

if [ -n "$PKGS" ]; then
  echo "将卸载：$PKGS"
  sudo pacman -Rns --noconfirm $PKGS
else
  echo "pacman 数据库里没有 liteloader-qqnt-bin / liteloader-qqnt-patcher，跳过包卸载。"
fi

echo
echo "[2/5] 恢复 QQ package.json..."
sudo python - <<'PYFIX'
import json
import shutil
import time
from pathlib import Path

app = Path("/opt/QQ/resources/app")
pkg = app / "package.json"

if not pkg.exists():
    print("错误：找不到", pkg)
    raise SystemExit(0)

try:
    current = json.loads(pkg.read_text(encoding="utf-8"))
except Exception as e:
    print("错误：package.json 读取失败:", e)
    raise SystemExit(0)

cur_main = str(current.get("main", ""))
print("current main:", cur_main)

# 优先找不是 LiteLoader 的备份
backups = sorted(app.glob("package.json.bak-*"), key=lambda x: x.stat().st_mtime, reverse=True)
restored = False

for bak in backups:
    try:
        data = json.loads(bak.read_text(encoding="utf-8"))
        main = str(data.get("main", ""))
    except Exception:
        continue

    if "LiteLoaderQQNT" not in main and "liteloader" not in main.lower():
        backup_now = pkg.with_name("package.json.before-remove-" + time.strftime("%Y%m%d-%H%M%S"))
        shutil.copy2(pkg, backup_now)
        shutil.copy2(bak, pkg)
        print("restored backup:", bak)
        restored = True
        break

if not restored:
    # 没有干净备份时，尝试写回 Linux QQ 常见入口
    candidates = [
        "./application/app_launcher/index.js",
        "application/app_launcher/index.js",
        "./app/app_launcher/index.js",
        "app/app_launcher/index.js"
    ]

    for cand in candidates:
        rel = cand[2:] if cand.startswith("./") else cand
        if (app / rel).exists():
            backup_now = pkg.with_name("package.json.before-remove-" + time.strftime("%Y%m%d-%H%M%S"))
            shutil.copy2(pkg, backup_now)
            current["main"] = cand
            pkg.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print("fallback main:", cand)
            restored = True
            break

if not restored:
    print("警告：没有找到可恢复的 QQ 原始 main。")
    print("建议重装 linuxqq 恢复 /opt/QQ/resources/app/package.json。")

try:
    data = json.loads(pkg.read_text(encoding="utf-8"))
    print("final main:", data.get("main"))
except Exception:
    pass
PYFIX

echo
echo "[3/5] 清理 /opt/QQ/resources/app/home 软链接..."
if [ -L "$APP/home" ]; then
  sudo rm -f "$APP/home"
  echo "已删除软链接：$APP/home"
elif [ -e "$APP/home" ]; then
  echo "$APP/home 存在但不是软链接，为安全起见不删除。"
else
  echo "$APP/home 不存在，跳过。"
fi

echo
echo "[4/5] 删除 LiteLoader 本体目录..."
rm -rf "$HOME/LiteLoaderQQNT"
echo "已删除：$HOME/LiteLoaderQQNT"

echo
echo "[5/5] 处理 LiteLoader 数据目录..."
if [ "$REMOVE_DATA" = "1" ]; then
  rm -rf "$HOME/.config/LiteLoaderQQNT"
  echo "已删除：$HOME/.config/LiteLoaderQQNT"
else
  echo "保留：$HOME/.config/LiteLoaderQQNT"
fi

echo
echo "卸载清理完成。"
echo "当前 QQ package main:"
grep -n '"main"' "$PKG" 2>/dev/null || true
`;

  return openTerminal(cmd, "卸载 LiteLoader");
});



function liteLoaderRepairCommand() {
  return `
set -e

LL="$HOME/LiteLoaderQQNT"
APP="/opt/QQ/resources/app"
PKG="$APP/package.json"

echo "[1/7] 跳过自动停止 QQ..."
echo "提示：请先手动关闭 QQ，或在进程页点“结束全部 QQ”。"

echo
echo "[2/7] 检查 LiteLoader 本体..."
if [ ! -f "$LL/package.json" ]; then
  echo "$LL/package.json 不存在，自动使用 ZIP 安装 LiteLoader 本体..."
  ${liteLoaderZipInstallCommand()}
else
  echo "LiteLoader 本体存在：$LL"
fi

echo
echo "[3/7] 准备插件目录..."
mkdir -p "$HOME/.config/LiteLoaderQQNT/plugins"

if [ -d "$LL/plugins" ] && [ ! -L "$LL/plugins" ]; then
  cp -an "$LL/plugins"/. "$HOME/.config/LiteLoaderQQNT/plugins"/ 2>/dev/null || true
fi

rm -rf "$LL/plugins"
ln -sT "$HOME/.config/LiteLoaderQQNT/plugins" "$LL/plugins"

echo
echo "[4/7] 强制修复 symlink：$APP/home -> /home ..."
sudo rm -rf "$APP/home"
sudo ln -sT /home "$APP/home"

echo
echo "[5/7] 修改 QQ package.json main -> $LL ..."
sudo env LL="$LL" python - <<'PYFIX'
import json
from pathlib import Path
import shutil
import time
import os

pkg = Path("/opt/QQ/resources/app/package.json")
backup = pkg.with_name("package.json.bak-" + time.strftime("%Y%m%d-%H%M%S"))

shutil.copy2(pkg, backup)

data = json.loads(pkg.read_text(encoding="utf-8"))
data["main"] = os.environ["LL"]

pkg.write_text(json.dumps(data, ensure_ascii=False, indent=2) + chr(10), encoding="utf-8")

print("backup:", backup)
print("main:", data["main"])
PYFIX

echo
echo "[6/7] 检查 package.json main..."
grep -n '"main"' "$PKG"

echo
echo "[依赖修复] 检查防撤回 level-party..."

CFG="$HOME/.config/LiteLoaderQQNT"
PLUG="$CFG/plugins"
PLUGIN="$PLUG/LiteLoaderQQNT-Anti-Recall"

mkdir -p "$PLUG"

if [ -d "$PLUGIN" ]; then
  cd "$PLUGIN"

  if command -v npm >/dev/null 2>&1; then
    if ! node -e 'require("level-party"); console.log("level-party OK")'; then
      echo "level-party 缺失或异常，重新安装依赖..."
      rm -rf node_modules package-lock.json
      npm install level-party
      npm install
      node -e 'require("level-party"); console.log("level-party OK")'
    fi
  else
    echo "警告：没有 npm，无法安装 level-party。"
  fi
else
  echo "未找到防撤回插件目录，跳过依赖修复：$PLUGIN"
fi

echo
echo "[7/7] 检查结果..."
echo "symlink:"
ls -ld "$APP/home"

echo
echo "LiteLoader 目录："
ls -la "$LL" | head -40

echo
echo "插件目录："
ls -ld "$LL/plugins"
find "$LL/plugins" -maxdepth 2 -name manifest.json -print 2>/dev/null || true

if [ -f "$LL/package.json" ]; then
  echo
  echo "修复完成：LiteLoader 本体存在。"
else
  echo
  echo "错误：修复后仍然没有 $LL/package.json"
  exit 1
fi

echo
echo "现在重新启动 QQ 即可。"
`;
}

ipcMain.handle("pkg:fix-liteloader-path", async () => {
  return openTerminal(
    liteLoaderRepairCommand(),
    "修复 LiteLoader 注入"
  );
});

ipcMain.handle("plugin:catalog", async () => ({ ok: true, catalog: PLUGIN_CATALOG }));



ipcMain.handle("plugin:repair-activation", async () => {
  const cmd = `
set -e

echo "[1/7] 关闭 QQ..."
sudo pkill -9 -x qq 2>/dev/null || true
sudo pkill -9 -x linuxqq 2>/dev/null || true

echo
echo "[2/7] 准备目录..."
TS="$(date +%Y%m%d-%H%M%S)"
CFG="$HOME/.config/LiteLoaderQQNT"
PLUG="$CFG/plugins"
LL="$HOME/LiteLoaderQQNT"
CACHE="$HOME/.cache/qq-control-center-arch/plugins"
ZIP="$CACHE/qq-anti-recall.zip"
EXTRACT="$CACHE/anti-recall-extract"
URL="https://github.com/xh321/LiteLoaderQQNT-Anti-Recall/releases/latest/download/qq-anti-recall.zip"

mkdir -p "$CFG" "$PLUG" "$LL" "$CACHE"
rm -rf "$EXTRACT"
mkdir -p "$EXTRACT"

echo
echo "[3/7] 备份并重置 LiteLoader 状态配置..."
if [ -d "$CFG/data" ]; then
  mv "$CFG/data" "$CFG/data.bak-$TS"
  echo "已备份：$CFG/data.bak-$TS"
fi
mkdir -p "$CFG/data"

echo
echo "[4/7] 下载防撤回 Release ZIP..."
DOWNLOAD_OK=0

if command -v curl >/dev/null 2>&1; then
  curl -L --fail -o "$ZIP" "$URL" && DOWNLOAD_OK=1 || true
elif command -v wget >/dev/null 2>&1; then
  wget -O "$ZIP" "$URL" && DOWNLOAD_OK=1 || true
else
  echo "没有 curl/wget，无法在线下载。"
fi

if [ "$DOWNLOAD_OK" != "1" ] || [ ! -s "$ZIP" ]; then
  echo "在线下载失败，尝试查找本地缓存..."
  LOCAL_ZIP="$(find "$HOME/.cache" "$HOME/Downloads" "$HOME/下载" -maxdepth 8 -type f \\( -name 'qq-anti-recall*.zip' -o -name '*Anti-Recall*.zip' \\) 2>/dev/null | head -n1 || true)"

  if [ -n "$LOCAL_ZIP" ] && [ -f "$LOCAL_ZIP" ]; then
    echo "使用本地缓存：$LOCAL_ZIP"
    cp "$LOCAL_ZIP" "$ZIP"
    DOWNLOAD_OK=1
  fi
fi

if [ "$DOWNLOAD_OK" != "1" ] || [ ! -s "$ZIP" ]; then
  echo "错误：没有拿到 qq-anti-recall.zip"
  exit 1
fi

echo
echo "[5/7] 解压并安装插件..."
python - "$ZIP" "$EXTRACT" <<'PYZIP'
import sys
import zipfile
from pathlib import Path

zip_path = Path(sys.argv[1])
out = Path(sys.argv[2])

with zipfile.ZipFile(zip_path) as z:
    z.extractall(out)

print("extracted:", out)
PYZIP

SRC="$(find "$EXTRACT" -maxdepth 5 -type f -name manifest.json | head -n1 | xargs -r dirname)"

if [ -z "$SRC" ] || [ ! -f "$SRC/manifest.json" ]; then
  echo "错误：zip 解压后找不到 manifest.json"
  find "$EXTRACT" -maxdepth 5 -type f | head -100
  exit 1
fi

echo "插件源目录：$SRC"

rm -rf "$PLUG/LiteLoaderQQNT-Anti-Recall"
mkdir -p "$PLUG/LiteLoaderQQNT-Anti-Recall"
cp -a "$SRC"/. "$PLUG/LiteLoaderQQNT-Anti-Recall"/

echo
echo "[6/7] 修复依赖和插件软链接..."
cd "$PLUG/LiteLoaderQQNT-Anti-Recall"

if [ -f package.json ]; then
  if command -v npm >/dev/null 2>&1; then
    npm install
  else
    echo "警告：没有 npm，跳过依赖安装。"
  fi
fi

if [ -d "$LL/plugins" ] && [ ! -L "$LL/plugins" ]; then
  cp -an "$LL/plugins"/. "$PLUG"/ 2>/dev/null || true
fi

rm -rf "$LL/plugins"
ln -sT "$PLUG" "$LL/plugins"

echo
echo "[依赖修复] 强制修复防撤回 level-party..."
cd "$PLUG/LiteLoaderQQNT-Anti-Recall"

if command -v npm >/dev/null 2>&1; then
  rm -rf node_modules package-lock.json
  npm install level-party
  npm install

  node -e 'require("level-party"); console.log("level-party OK")'
else
  echo "错误：没有 npm，无法安装 level-party"
  exit 1
fi

echo
echo "[7/7] 检查结果..."
echo "插件 manifest:"
find -L "$LL/plugins" -maxdepth 3 -name manifest.json -print
find "$PLUG" -maxdepth 3 -name manifest.json -print

echo
echo "插件文件:"
ls -la "$PLUG/LiteLoaderQQNT-Anti-Recall" | head -80

echo
echo "关键文件检查:"
test -f "$PLUG/LiteLoaderQQNT-Anti-Recall/manifest.json" && echo "OK manifest.json"
test -f "$PLUG/LiteLoaderQQNT-Anti-Recall/main.js" && echo "OK main.js"
test -f "$PLUG/LiteLoaderQQNT-Anti-Recall/preload.js" && echo "OK preload.js"
test -f "$PLUG/LiteLoaderQQNT-Anti-Recall/renderer.js" && echo "OK renderer.js"

echo
echo "防撤回设置空白修复完成。现在重新启动 QQ。"
`;

  return openTerminal(cmd, "一键修复防撤回设置空白");
});


ipcMain.handle("plugin:list", async () => ({ ok: true, plugins: await listPlugins() }));

ipcMain.handle("plugin:install", async (_, key) => {
  const item = PLUGIN_CATALOG[key];
  if (!item) return { ok: false, message: "插件不存在" };

  fs.mkdirSync(PLUGIN_DIR, { recursive: true });
  const target = pluginTarget(item.dir);

  const cmd = fs.existsSync(target)
    ? `git -C ${shellQuote(target)} pull --ff-only`
    : `git clone --depth=1 ${shellQuote(item.repo)} ${shellQuote(target)}`;

  const res = await run("bash", ["-lc", cmd]);
  return { ok: res.ok, message: res.ok ? `${item.name} 安装完成` : `${item.name} 安装失败`, detail: res.stderr || res.error };
});

ipcMain.handle("plugin:install-custom", async (_, repo) => {
  repo = String(repo || "").trim();

  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\.git)?$/.test(repo)) {
    return { ok: false, message: "只允许 GitHub HTTPS 仓库" };
  }

  fs.mkdirSync(PLUGIN_DIR, { recursive: true });
  const name = repo.split("/").pop().replace(/\.git$/, "").replace(/[^A-Za-z0-9_.-]/g, "");
  const target = pluginTarget(name);

  const cmd = fs.existsSync(target)
    ? `git -C ${shellQuote(target)} pull --ff-only`
    : `git clone --depth=1 ${shellQuote(repo)} ${shellQuote(target)}`;

  const res = await run("bash", ["-lc", cmd]);
  return { ok: res.ok, message: res.ok ? "自定义插件安装完成" : "自定义插件安装失败", detail: res.stderr || res.error };
});

ipcMain.handle("plugin:remove", async (_, dir) => {
  try {
    fs.rmSync(pluginTarget(dir), { recursive: true, force: true });
    return { ok: true, message: "插件已删除" };
  } catch (err) {
    return { ok: false, message: "删除失败：" + err.message };
  }
});

ipcMain.handle("log:read", async () => {
  if (!fs.existsSync(LOG_FILE)) return "暂无日志";
  return fs.readFileSync(LOG_FILE, "utf8") || "暂无日志";
});

ipcMain.handle("log:clear", async () => {
  fs.writeFileSync(LOG_FILE, "");
  return { ok: true, message: "日志已清空" };
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
