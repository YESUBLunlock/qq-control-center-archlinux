# QQ Control Center Arch Linux

一个针对 Arch Linux 的 QQ 启动器。

## 功能

- 启动 QQ
- QQ 进程管理
- 安装 / 卸载 QQ
- 安装 / 卸载 LiteLoader
- 修复 LiteLoader 插件和注入
- 插件管理
- 日志查看
- 自定义主题色

## 环境要求

- Arch Linux
- Electron（源包启动）
- npm（源包启动）
- git（源包启动）

安装基础依赖：

```bash
sudo pacman -S electron npm git base-devel
```

## 源码运行

```bash
git clone https://github.com/YESUBLunlock/qq-control-center-archlinux.git
cd qq-control-center-archlinux
npm start
```

## makepkg 构建安装

适合从源码构建 Arch 软件包：

```bash
git clone https://github.com/YESUBLunlock/qq-control-center-archlinux.git
cd qq-control-center-archlinux
makepkg -si
```

安装完成后运行：

```bash
qq-control-center
```

也可以直接在系统应用菜单里搜索 `QQ Control Center` 打开。

## pacman 安装本地包

如果你已经下载或构建出了 `.pkg.tar.zst` 文件，可以用 pacman 安装：

```bash
sudo pacman -U ./qq-control-center-*.pkg.tar.zst
```

卸载：

```bash
sudo pacman -Rns qq-control-center
```

## yay / AUR 安装

如果本项目已经发布到 AUR，可以直接使用：

```bash
yay -S qq-control-center
```

如果还没有发布到 AUR，`yay -S qq-control-center` 会提示找不到包。  
这种情况下请使用源码方式：

```bash
git clone https://github.com/YESUBLunlock/qq-control-center-archlinux.git
cd qq-control-center-archlinux
makepkg -si
```

## 更新

源码运行：

```bash
git pull
npm start
```

makepkg / pacman 安装：

```bash
git pull
makepkg -si
```

yay / AUR 安装：

```bash
yay -Syu qq-control-center
```

## 说明

本项目主要面向 Arch Linux。

LiteLoader 和插件相关功能依赖本机 QQ / LiteLoader 环境，部分操作需要 sudo 权限。

`makepkg` 用于根据 `PKGBUILD` 构建 Arch 软件包。  
`pacman` 用于安装已经构建好的 `.pkg.tar.zst` 包。  
`yay` 用于从 AUR 获取 `PKGBUILD` 并自动构建安装。
EOF
