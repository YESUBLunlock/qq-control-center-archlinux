pkgname=qq-control-center
pkgver=1.0.0
pkgrel=1
pkgdesc="QQ Control Center Electron UI for Arch Linux"
arch=('x86_64')
url="https://github.com/YESUBLunlock/qq-control-center-archlinux"
license=('MIT')
depends=('electron')
makedepends=('git')
source=("${pkgname}-${pkgver}.tar.gz::https://github.com/YESUBLunlock/qq-control-center-archlinux/archive/refs/tags/v${pkgver}.tar.gz")
sha256sums=('SKIP')

package() {
  cd "$srcdir/qq-control-center-archlinux-${pkgver}"

  install -d "$pkgdir/opt/qq-control-center"

  find . \
    -mindepth 1 \
    -maxdepth 1 \
    ! -name ".git" \
    ! -name "pkg" \
    ! -name "src" \
    ! -name "*.pkg.tar.zst" \
    -exec cp -r {} "$pkgdir/opt/qq-control-center/" \;

  install -d "$pkgdir/usr/bin"

  cat > "$pkgdir/usr/bin/qq-control-center" <<'EOL'
#!/bin/bash
exec electron --class=qq-control-center /opt/qq-control-center "$@"
EOL

  chmod +x "$pkgdir/usr/bin/qq-control-center"

  install -Dm644 "$srcdir/qq-control-center-archlinux-${pkgver}/assets/icon.png" \
    "$pkgdir/usr/share/icons/hicolor/256x256/apps/qq-control-center.png"

  install -Dm644 /dev/stdin "$pkgdir/usr/share/applications/qq-control-center.desktop" <<'EOL'
[Desktop Entry]
Name=QQ Control Center
Comment=QQ Control Center for Arch Linux
Exec=qq-control-center
Icon=qq-control-center
Terminal=false
Type=Application
Categories=Network;InstantMessaging;Utility;
StartupNotify=true
StartupWMClass=qq-control-center
EOL
}
