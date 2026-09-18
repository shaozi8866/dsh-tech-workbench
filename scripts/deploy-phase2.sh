#!/bin/bash
# ============================================================
# dsh-tech-workbench v2.4.0 二期部署（南山客 09-18 批准：部署+重启）
# 步骤：新鲜备份 → 构建 → 刷新拷贝 → pnpm 链接 → 版本闸 → pm2 restart → 验证
# 本脚本以 setsid nohup 运行，挺过 dsh 重启；日志落 /tmp/wb-deploy-<ts>.log
# ============================================================
set -uo pipefail

DEV_DIR="/home/ecs-assist-user/workplace/project/projects/dsh-tech-workbench"
PROFILE_DIR="$HOME/.dsh/profiles/web"
PLUGIN="dsh-tech-workbench"
TS=$(date +%Y%m%d-%H%M%S)
LOG="/tmp/wb-deploy-$TS.log"
BK="$DEV_DIR/backup/pre-deploy-$TS"

log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

exec > >(tee -a "$LOG") 2>&1
log "=== 部署开始 $TS ==="

# 1. 新鲜备份（package.json / patch / 当前插件实体拷贝）
mkdir -p "$BK"
cp -a "$PROFILE_DIR/package.json" "$BK/package.json.bak"
cp -a "$PROFILE_DIR/cordis.patch.yml" "$BK/cordis.patch.yml.bak" 2>/dev/null || echo "[]" > "$BK/cordis.patch.yml.bak"
if [ -d "$PROFILE_DIR/node_modules/$PLUGIN" ] || [ -L "$PROFILE_DIR/node_modules/$PLUGIN" ]; then
  cp -aL "$PROFILE_DIR/node_modules/$PLUGIN" "$BK/plugin-copy" 2>/dev/null || log "WARN: 插件旧拷贝备份失败"
fi
log "[1/6] 备份完成: $BK"

# 2. 构建
cd "$DEV_DIR"
./node_modules/.bin/tsdown || { log "FATAL: 构建失败，中止（未触碰生产）"; exit 1; }
log "[2/6] 构建完成"

# 3. 版本闸：开发目录 package.json 必须是 2.4.0
V=$(python3 -c "import json;print(json.load(open('$DEV_DIR/package.json'))['version'])")
if [ "$V" != "2.4.0" ]; then log "FATAL: 版本闸拦截 v$V"; exit 1; fi
log "[3/6] 版本闸通过 v$V"

# 4. 刷新生产拷贝（rm 链接或目录 → 纯新增实体拷贝，剥离开发杂物）
rm -rf "$PROFILE_DIR/node_modules/$PLUGIN"
cp -r "$DEV_DIR" "$PROFILE_DIR/node_modules/$PLUGIN"
rm -rf "$PROFILE_DIR/node_modules/$PLUGIN/node_modules" \
       "$PROFILE_DIR/node_modules/$PLUGIN/.git" \
       "$PROFILE_DIR/node_modules/$PLUGIN/tests" \
       "$PROFILE_DIR/node_modules/$PLUGIN/backup" \
       "$PROFILE_DIR/node_modules/$PLUGIN/scripts" \
       "$PROFILE_DIR/node_modules/$PLUGIN/src" \
       "$PROFILE_DIR/node_modules/$PLUGIN/SPEC.md"
GV=$(python3 -c "import json;print(json.load(open('$PROFILE_DIR/node_modules/$PLUGIN/package.json'))['version'])")
log "[4/6] 生产拷贝已刷新 v$GV"

# 5. pnpm 对齐（file: 依赖；失败不致命——实体拷贝已就位）
cd "$PROFILE_DIR"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --no-frozen-lockfile 2>&1 | tail -5 || log "WARN: pnpm install 非零退出，实体拷贝仍有效"
  # pnpm 可能把实体目录替换为 symlink → 复核并兜底
  if [ -L "$PROFILE_DIR/node_modules/$PLUGIN" ]; then
    TARGET=$(readlink -f "$PROFILE_DIR/node_modules/$PLUGIN")
    log "pnpm 已将其链接到 $TARGET（开发目录直读，lib/ 已构建，等价生效）"
  fi
fi
log "[5/6] 依赖链接核对完成"

# 6. 重启 dsh（已获批准）→ 验证。禁 --update-env（09-17 实证会污染线上环境）
log "[6/6] pm2 restart dsh ..."
pm2 restart dsh 2>&1 | tail -3
sleep 25
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3080/workbench/api/status || echo "000")
log "重启后 /workbench/api/status → HTTP $CODE (401=需登录属正常, 200=直通)"
SV=$(curl -s --max-time 10 http://127.0.0.1:3080/workbench/api/status 2>/dev/null | head -c 200)
log "status 响应头200字节: $SV"
pm2 describe dsh 2>/dev/null | grep -E "status|restarts|uptime" | head -4 | tee -a "$LOG"
log "=== 部署流程结束 ==="
