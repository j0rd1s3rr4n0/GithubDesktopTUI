#!/usr/bin/env bash
# ==============================================================================
# 🐙 GitHub Desktop TUI (gd / gitu) - Universal Universal Linux Auto-Installer
# Created by Jordi Serrano (j0rd1s3rr4n0) - https://github.com/j0rd1s3rr4n0
# ==============================================================================

set -e

REPO_URL="https://github.com/j0rd1s3rr4n0/git-desktop-tui"
ISSUES_URL="https://github.com/j0rd1s3rr4n0/git-desktop-tui/issues"

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Error Trap Handler
error_handler() {
    local exit_code="$1"
    local line_number="$2"
    echo ""
    echo -e "${RED}${BOLD}======================================================================${NC}"
    echo -e "${RED}${BOLD}❌ INSTALLATION FAILED at line ${line_number} (Exit Code: ${exit_code})${NC}"
    echo -e "${RED}${BOLD}======================================================================${NC}"
    echo ""
    echo -e "${YELLOW}An unexpected issue occurred while installing GitHub Desktop TUI (gd).${NC}"
    echo ""
    echo -e "${BOLD}📌 Please report this issue on GitHub so we can fix it for your Linux distro:${NC}"
    echo -e "   👉 ${CYAN}${BOLD}${ISSUES_URL}${NC}"
    echo ""
    echo -e "${BOLD}💡 What to include in your bug report:${NC}"
    echo -e "   1. Your Linux Distro & Version (${CYAN}cat /etc/os-release${NC})"
    echo -e "   2. The exact error output shown above (Line ${line_number})"
    echo -e "   3. ${GREEN}${BOLD}If you have a solution or workaround, please add it to the ticket!${NC}"
    echo ""
    echo -e "${RED}${BOLD}======================================================================${NC}"
    exit "${exit_code}"
}

trap 'error_handler $? $LINENO' ERR

echo -e "${CYAN}${BOLD}"
echo "   🐙 GitHub Desktop TUI (gd / gitu) Universal Installer"
echo "   ======================================================"
echo -e "${NC}"

# Detect OS & Package Manager
OS_TYPE="unknown"
PKG_MANAGER=""

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_TYPE=$ID
fi

echo -e "${BLUE}ℹ️  Detecting Linux Environment: ${YELLOW}${NAME:-Linux} (${OS_TYPE})${NC}"

# Determine Privileges (sudo or root)
SUDO_CMD=""
if [ "$EUID" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        SUDO_CMD="sudo"
    else
        echo -e "${YELLOW}⚠️  Warning: Neither root privileges nor 'sudo' command found. Some package installations may require elevated access.${NC}"
    fi
fi

# Detect Package Manager
if command -v apt-get >/dev/null 2>&1; then
    PKG_MANAGER="apt"
elif command -v dnf >/dev/null 2>&1; then
    PKG_MANAGER="dnf"
elif command -v yum >/dev/null 2>&1; then
    PKG_MANAGER="yum"
elif command -v pacman >/dev/null 2>&1; then
    PKG_MANAGER="pacman"
elif command -v zypper >/dev/null 2>&1; then
    PKG_MANAGER="zypper"
elif command -v apk >/dev/null 2>&1; then
    PKG_MANAGER="apk"
elif command -v xbps-install >/dev/null 2>&1; then
    PKG_MANAGER="xbps"
fi

echo -e "${BLUE}ℹ️  Package Manager Detected: ${GREEN}${PKG_MANAGER:-None Found}${NC}"
echo ""

# 1. Install Essential Dependencies (git, curl, python3, pip, xclip/wl-clipboard)
echo -e "${MAGENTA}${BOLD}📦 Step 1: Checking & Installing System Dependencies...${NC}"

install_pkg() {
    local pkg="$1"
    echo -e "${BLUE}  --> Installing ${pkg}...${NC}"
    case "$PKG_MANAGER" in
        apt)
            $SUDO_CMD apt-get update -qq >/dev/null 2>&1 || true
            $SUDO_CMD apt-get install -y -qq "$pkg" >/dev/null 2>&1 || true
            ;;
        dnf)
            $SUDO_CMD dnf install -y -q "$pkg" >/dev/null 2>&1 || true
            ;;
        yum)
            $SUDO_CMD yum install -y -q "$pkg" >/dev/null 2>&1 || true
            ;;
        pacman)
            $SUDO_CMD pacman -Sy --noconfirm "$pkg" >/dev/null 2>&1 || true
            ;;
        zypper)
            $SUDO_CMD zypper --quiet install -y "$pkg" >/dev/null 2>&1 || true
            ;;
        apk)
            $SUDO_CMD apk add --quiet "$pkg" >/dev/null 2>&1 || true
            ;;
        xbps)
            $SUDO_CMD xbps-install -Sy "$pkg" >/dev/null 2>&1 || true
            ;;
    esac
}

# Check Git
if ! command -v git >/dev/null 2>&1; then
    install_pkg git
fi

# Check Curl
if ! command -v curl >/dev/null 2>&1; then
    install_pkg curl
fi

# Check Python 3
if ! command -v python3 >/dev/null 2>&1; then
    install_pkg python3
fi

# Check Pillow / PIL for Python3
if ! python3 -c "from PIL import Image" >/dev/null 2>&1; then
    echo -e "${BLUE}  --> Installing Python Pillow (PIL) for TrueColor ANSI image rendering...${NC}"
    case "$PKG_MANAGER" in
        apt) install_pkg python3-pil || install_pkg python3-pip ;;
        dnf|yum) install_pkg python3-pillow || install_pkg python3-pip ;;
        pacman) install_pkg python-pillow ;;
        *) install_pkg python3-pip ;;
    esac

    if ! python3 -c "from PIL import Image" >/dev/null 2>&1; then
        if command -v pip3 >/dev/null 2>&1; then
            pip3 install --break-system-packages pillow >/dev/null 2>&1 || pip3 install pillow >/dev/null 2>&1 || true
        fi
    fi
fi

# Check Clipboard tools (xclip / wl-clipboard)
if ! command -v xclip >/dev/null 2>&1 && ! command -v wl-copy >/dev/null 2>&1; then
    echo -e "${BLUE}  --> Installing Clipboard Utility (xclip)...${NC}"
    install_pkg xclip || install_pkg wl-clipboard || true
fi

# 2. Check & Install Node.js (v18+)
echo -e "${MAGENTA}${BOLD}⚡ Step 2: Checking Node.js Environment (v18+ Required)...${NC}"

NODE_VER=0
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
fi

if [ "$NODE_VER" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js is missing or version < 18 (Detected v${NODE_VER}). Installing Node.js v20 LTS...${NC}"
    if command -v curl >/dev/null 2>&1; then
        if [ "$PKG_MANAGER" = "apt" ]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | ${SUDO_CMD:+$SUDO_CMD -E} bash -
            $SUDO_CMD apt-get install -y nodejs
        elif [ "$PKG_MANAGER" = "dnf" ] || [ "$PKG_MANAGER" = "yum" ]; then
            curl -fsSL https://rpm.nodesource.com/setup_20.x | $SUDO_CMD bash -
            $SUDO_CMD dnf install -y nodejs || $SUDO_CMD yum install -y nodejs
        else
            # Fallback NVM installation
            echo -e "${BLUE}  --> Installing Node.js via NVM (Node Version Manager)...${NC}"
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            nvm install 20
            nvm use 20
        fi
    fi
fi

echo -e "${GREEN}✓ Node.js $(node -v) is active!${NC}"

# 3. Check GitHub CLI (gh)
echo -e "${MAGENTA}${BOLD}🐙 Step 3: Checking GitHub CLI (gh)...${NC}"
if ! command -v gh >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) is not installed. Installing GitHub CLI...${NC}"
    case "$PKG_MANAGER" in
        apt)
            (type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) \
            && sudo mkdir -p -m 755 /etc/apt/keyrings \
            && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
            && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
            && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
            && sudo apt update \
            && sudo apt install gh -y || true
            ;;
        dnf|yum)
            $SUDO_CMD dnf install -y github-cli || $SUDO_CMD yum install -y github-cli || true
            ;;
        pacman)
            $SUDO_CMD pacman -Sy --noconfirm github-cli || true
            ;;
        *)
            install_pkg gh || true
            ;;
    esac
fi

if command -v gh >/dev/null 2>&1; then
    echo -e "${GREEN}✓ GitHub CLI ($(gh --version | head -n 1)) is available!${NC}"
else
    echo -e "${YELLOW}⚠️  GitHub CLI could not be auto-installed. You can install it manually from https://cli.github.com${NC}"
fi

# 4. Install Project Dependencies & Link Binaries
echo -e "${MAGENTA}${BOLD}🚀 Step 4: Installing Project NPM Packages & Linking Binaries...${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

npm install --quiet

echo -e "${BLUE}  --> Linking global commands 'gd', 'gitu', and 'ghtui'...${NC}"
$SUDO_CMD npm link --force || npm link --force

# Verify global command setup
mkdir -p "$HOME/.local/bin"
if [ -f "$HOME/.local/bin/gd" ] || command -v gd >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Global CLI commands 'gd', 'gitu', and 'ghtui' linked successfully!${NC}"
else
    # Fallback symlink to ~/.local/bin
    ln -sf "$SCRIPT_DIR/bin/gitu.js" "$HOME/.local/bin/gd"
    ln -sf "$SCRIPT_DIR/bin/gitu.js" "$HOME/.local/bin/gitu"
    ln -sf "$SCRIPT_DIR/bin/gitu.js" "$HOME/.local/bin/ghtui"
    chmod +x "$HOME/.local/bin/gd" "$HOME/.local/bin/gitu" "$HOME/.local/bin/ghtui"
    echo -e "${GREEN}✓ Created fallback symlinks in $HOME/.local/bin/ (gd, gitu, ghtui)${NC}"
fi

# 5. Desktop Entry & App Icon (GUI menu / /opt launch)
echo -e "${MAGENTA}${BOLD}🖼️  Step 5: Installing App Icon & Desktop Entry...${NC}"

ICON_SRC="$SCRIPT_DIR/images/icon.png"
DESKTOP_FILE="$HOME/.local/share/applications/git-desktop-tui.desktop"

if [ -f "$ICON_SRC" ]; then
    ICON_DEST="$HOME/.local/share/icons/hicolor/256x256/apps/git-desktop-tui.png"
    mkdir -p "$(dirname "$ICON_DEST")" "$(dirname "$DESKTOP_FILE")"

    if cp "$ICON_SRC" "$ICON_DEST" 2>/dev/null; then
        echo -e "${GREEN}✓ App icon installed to ${CYAN}$ICON_DEST${NC}"
    else
        ICON_DEST="$SCRIPT_DIR/images/icon.png"
        echo -e "${YELLOW}⚠️  Could not copy icon system-wide; using repo icon path.${NC}"
    fi

    BIN_PATH="$(command -v gd || command -v gitu || echo "$SCRIPT_DIR/bin/gitu.js")"

    cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=GitHub Desktop TUI
Comment=Modern Git & GitHub terminal UI
Exec=$BIN_PATH
Icon=$ICON_DEST
Terminal=true
Categories=Development;Git;Utility;
Keywords=git;github;cli;tui;
EOF

    chmod +x "$DESKTOP_FILE" 2>/dev/null || true
    echo -e "${GREEN}✓ Desktop entry created: ${CYAN}$DESKTOP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  App icon not found ($ICON_SRC); skipping desktop entry.${NC}"
fi

# Final Success Message
echo ""
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 SUCCESS! GitHub Desktop TUI is successfully installed!${NC}"
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo ""
echo -e "${BOLD}How to run:${NC}"
echo -e "  Type ${CYAN}${BOLD}gd${NC} or ${CYAN}${BOLD}ghtui${NC} in any terminal directory:"
echo ""
echo -e "     ${GREEN}${BOLD}gd${NC}     ${YELLOW}(short alias)${NC}"
echo -e "     ${GREEN}${BOLD}ghtui${NC}  ${YELLOW}(full name)${NC}"
echo ""
echo -e "${BOLD}🖥️  Desktop Menu:${NC}"
echo -e "  Look for ${GREEN}${BOLD}GitHub Desktop TUI${NC} in your application menu"
echo -e "  (or run ${CYAN}${BOLD}gio launch git-desktop-tui.desktop${NC})."
echo ""
echo -e "${YELLOW}Enjoying GitHub Desktop TUI? Star the repo on GitHub!${NC}"
echo -e "👉 ${CYAN}${BOLD}${REPO_URL}${NC}"
echo ""

