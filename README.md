# QQ Control Center Arch Linux

一个针对 Arch Linux 的 QQ 启动器，可配合 LiteLoader 插件使用。

## 功能

- 启动 QQ
- QQ 进程管理
- 安装 / 卸载 QQ
- 安装 / 卸载 LiteLoader
- 修复 LiteLoader/插件
- 插件管理
- 日志查看
- 自定义主题色

## 安装

### 方式一：AUR / yay 安装（推荐）

可以直接执行：

```bash
yay -S qq-control-center
```

安装完成后运行：

```bash
qq-control-center
```

也可以直接在系统应用菜单里搜索 `QQ Control Center` 打开。

### 方式二：pacman 安装本地包

从 GitHub Releases 下载 `.pkg.tar.zst` 后执行：

```bash
sudo pacman -U ./qq-control-center-*.pkg.tar.zst
```

安装完成后运行：

```bash
qq-control-center
```

卸载：

```bash
sudo pacman -Rns qq-control-center
```

### 方式三：makepkg 从源码构建

安装基础依赖：

```bash
sudo pacman -S electron npm git base-devel
```

克隆源码：

```bash
git clone https://github.com/YESUBLunlock/qq-control-center-archlinux.git
cd qq-control-center-archlinux
```

构建并安装：

```bash
makepkg -si
```

安装完成后运行：

```bash
qq-control-center
```

### 方式四：源码开发运行

适合修改源码或临时测试：

```bash
git clone https://github.com/YESUBLunlock/qq-control-center-archlinux.git
cd qq-control-center-archlinux
npm start
```

## 更新

### AUR / yay 安装方式

```bash
yay -Syu qq-control-center
```

### pacman 本地包方式

下载新版 `.pkg.tar.zst` 后执行：

```bash
sudo pacman -U ./qq-control-center-*.pkg.tar.zst
```

### makepkg 源码构建方式

```bash
cd qq-control-center-archlinux
git pull
makepkg -si
```

### 源码开发运行方式

```bash
cd qq-control-center-archlinux
git pull
npm start
```

## 说明

本项目主要面向 Arch Linux。

LiteLoader 和插件相关功能依赖本机 QQ / LiteLoader 环境，部分操作需要 sudo 权限。

`yay` 用于从 AUR 获取 `PKGBUILD` 并自动构建安装。  
`pacman` 用于安装已经构建好的 `.pkg.tar.zst` 包。  
`makepkg` 用于根据 `PKGBUILD` 从源码构建 Arch 软件包。  
`npm start` 只适合源码运行或开发测试。
