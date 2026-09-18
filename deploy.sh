#!/bin/bash
# ============================================================
# dsh-tech-workbench 部署脚本
# 用途：将开发版本部署到 web profile
# 部署时间：2026-09-17T13:12:33.748Z
# ============================================================

set -e

DEV_DIR="/home/ecs-assist-user/workplace/project/projects/dsh-tech-workbench"
PROFILE_DIR="$HOME/.dsh/profiles/web"
PLUGIN_NAME="dsh-tech-workbench"
BACKUP_DIR="$DEV_DIR/backup/pre-deploy"

echo "=== dsh-tech-workbench 部署脚本 ==="
echo "开发目录: $DEV_DIR"
echo "Profile 目录: $PROFILE_DIR"
echo ""

# 0. 前置检查
echo "[检查] 确认备份存在 ..."
if [ ! -d "$BACKUP_DIR/dsh-tech-workbench.bak" ]; then
    echo "  ✗ 未找到备份，请先运行备份"
    exit 1
fi
echo "  ✓ 备份存在"

# 1. 构建开发版本
echo "[1/5] 构建开发版本 ..."
cd "$DEV_DIR"
if [ -f "node_modules/.bin/tsdown" ]; then
    ./node_modules/.bin/tsdown
    echo "  ✓ 构建完成"
else
    echo "  ✗ tsdown 未安装"
    exit 1
fi

# 2. 替换 node_modules 中的插件
echo "[2/5] 替换 $PLUGIN_NAME ..."
rm -rf "$PROFILE_DIR/node_modules/$PLUGIN_NAME"
cp -r "$DEV_DIR" "$PROFILE_DIR/node_modules/$PLUGIN_NAME"
# 移除开发依赖，减小体积
rm -rf "$PROFILE_DIR/node_modules/$PLUGIN_NAME/node_modules"
rm -rf "$PROFILE_DIR/node_modules/$PLUGIN_NAME/.git"
rm -rf "$PROFILE_DIR/node_modules/$PLUGIN_NAME/tests"
rm -rf "$PROFILE_DIR/node_modules/$PLUGIN_NAME/backup"
echo "  ✓ 插件已替换"

# 3. 更新 package.json 中的依赖指向本地路径
echo "[3/5] 更新 package.json ..."
cd "$PROFILE_DIR"
# 将 GitHub URL 替换为本地文件路径
sed -i "s|"$PLUGIN_NAME": "https://codeload.github.com/shaozi8866/dsh-tech-workbench/tar.gz/refs/heads/main"|"$PLUGIN_NAME": "file:$DEV_DIR"|g" package.json
echo "  ✓ package.json 已更新"

# 4. 重新安装依赖（链接本地版本）
echo "[4/5] 链接本地版本 ..."
cd "$PROFILE_DIR"
if command -v pnpm &> /dev/null; then
    pnpm install --no-frozen-lockfile 2>&1 | tail -5
    echo "  ✓ 依赖已链接"
else
    echo "  ⚠ pnpm 未找到，跳过链接（重启后生效）"
fi

# 5. 重启 dsh
echo "[5/5] 重启 dsh ..."
if pm2 describe dsh > /dev/null 2>&1; then
    pm2 restart dsh
    echo "  ✓ dsh 已重启"
else
    echo "  ✗ dsh 进程不存在，请手动启动"
fi

echo ""
echo "=== 部署完成 ==="
echo "请验证: dsh 启动后访问 Web 界面确认功能正常"
echo "如需回滚: bash $DEV_DIR/restore.sh"

