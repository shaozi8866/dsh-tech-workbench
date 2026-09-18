#!/bin/bash
# ============================================================
# dsh-tech-workbench 恢复脚本
# 用途：在部署失败时回滚到之前的版本
# 备份时间：2026-09-17T13:12:33.748Z
# ============================================================

set -e

BACKUP_DIR="/home/ecs-assist-user/workplace/project/projects/dsh-tech-workbench/backup/pre-deploy"
PROFILE_DIR="$HOME/.dsh/profiles/web"
PLUGIN_NAME="dsh-tech-workbench"

echo "=== dsh-tech-workbench 恢复脚本 ==="
echo "备份目录: $BACKUP_DIR"
echo "Profile 目录: $PROFILE_DIR"
echo ""

# 1. 恢复 package.json
if [ -f "$BACKUP_DIR/package.json.bak" ]; then
    echo "[1/4] 恢复 package.json ..."
    cp "$BACKUP_DIR/package.json.bak" "$PROFILE_DIR/package.json"
    echo "  ✓ package.json 已恢复"
else
    echo "  ✗ 未找到 package.json 备份"
fi

# 2. 恢复 cordis.patch.yml
if [ -f "$BACKUP_DIR/cordis.patch.yml.bak" ]; then
    echo "[2/4] 恢复 cordis.patch.yml ..."
    cp "$BACKUP_DIR/cordis.patch.yml.bak" "$PROFILE_DIR/cordis.patch.yml"
    echo "  ✓ cordis.patch.yml 已恢复"
else
    echo "  ✗ 未找到 cordis.patch.yml 备份"
fi

# 3. 恢复插件目录
if [ -d "$BACKUP_DIR/dsh-tech-workbench.bak" ]; then
    echo "[3/4] 恢复 $PLUGIN_NAME ..."
    rm -rf "$PROFILE_DIR/node_modules/$PLUGIN_NAME"
    cp -r "$BACKUP_DIR/dsh-tech-workbench.bak" "$PROFILE_DIR/node_modules/$PLUGIN_NAME"
    echo "  ✓ $PLUGIN_NAME 已恢复"
else
    echo "  ✗ 未找到 $PLUGIN_NAME 备份"
fi

# 4. 重启 dsh
echo "[4/4] 重启 dsh ..."
if pm2 describe dsh > /dev/null 2>&1; then
    pm2 restart dsh
    echo "  ✓ dsh 已重启"
else
    echo "  ✗ dsh 进程不存在，请手动启动"
fi

echo ""
echo "=== 恢复完成 ==="
echo "请验证: dsh 启动后访问 Web 界面确认功能正常"

