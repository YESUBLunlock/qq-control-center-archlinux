const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  repairPluginActivation: () => ipcRenderer.invoke("plugin:repair-activation"),
  winMin: () => ipcRenderer.invoke("window:minimize"),
  winMax: () => ipcRenderer.invoke("window:maximize"),
  winClose: () => ipcRenderer.invoke("window:close"),

  systemStatus: () => ipcRenderer.invoke("system:status"),

  qqStart: () => ipcRenderer.invoke("qq:start"),
  qqList: () => ipcRenderer.invoke("qq:list"),
  qqKillOne: pid => ipcRenderer.invoke("qq:kill-one", pid),
  qqKillAll: () => ipcRenderer.invoke("qq:kill-all"),

  installQQ: pkg => ipcRenderer.invoke("pkg:install-qq", pkg),
  removeQQ: pkg => ipcRenderer.invoke("pkg:remove-qq", pkg),

  installLiteLoader: () => ipcRenderer.invoke("pkg:install-liteloader"),
  removeLiteLoader: removeData => ipcRenderer.invoke("pkg:remove-liteloader", removeData),
  fixLiteLoaderPath: () => ipcRenderer.invoke("pkg:fix-liteloader-path"),

  pluginCatalog: () => ipcRenderer.invoke("plugin:catalog"),
  pluginList: () => ipcRenderer.invoke("plugin:list"),
  pluginInstall: key => ipcRenderer.invoke("plugin:install", key),
  pluginInstallCustom: repo => ipcRenderer.invoke("plugin:install-custom", repo),
  pluginRemove: dir => ipcRenderer.invoke("plugin:remove", dir),

  logRead: () => ipcRenderer.invoke("log:read"),
  logClear: () => ipcRenderer.invoke("log:clear"),

  terminalInput: text => ipcRenderer.invoke("terminal:input", text),
  terminalStop: () => ipcRenderer.invoke("terminal:stop"),

  onTerminalData: callback => {
    ipcRenderer.removeAllListeners("terminal:data");
    ipcRenderer.on("terminal:data", (_, data) => callback(data));
  },

  onTerminalClear: callback => {
    ipcRenderer.removeAllListeners("terminal:clear");
    ipcRenderer.on("terminal:clear", () => callback());
  },

  onTerminalExit: callback => {
    ipcRenderer.removeAllListeners("terminal:exit");
    ipcRenderer.on("terminal:exit", (_, data) => callback(data));
  }
});
