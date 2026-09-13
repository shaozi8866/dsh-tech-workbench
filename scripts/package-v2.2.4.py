"""
打包 dsh-tech-workbench 插件
使用 Python zipfile 确保 Unix 正斜杠路径
"""

import os
import zipfile
import hashlib

# 配置
project_dir = r"D:\Users\Flora\桌面\统一风格实现\dsh-tech-workbench"
output_zip = r"D:\Users\Flora\桌面\统一风格实现\dsh-tech-workbench-v2.2.4.zip"
package_name = "dsh-tech-workbench"

# 需要包含的文件和目录
include_files = [
    "package.json",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "cordis.patch.yml",
    "lib/index.js",
    "lib/client.js",
    "lib/client.js.map",
]

print(f"开始打包 {package_name} v2.2.4...")
print(f"项目目录: {project_dir}")
print(f"输出文件: {output_zip}")
print()

# 创建 zip 文件
with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for file_path in include_files:
        full_path = os.path.join(project_dir, file_path)
        if os.path.exists(full_path):
            # 使用正斜杠路径，包含顶层目录
            arcname = f"{package_name}/{file_path}"
            zipf.write(full_path, arcname)
            file_size = os.path.getsize(full_path)
            print(f"  ✓ {file_path} ({file_size:,} bytes)")
        else:
            print(f"  ✗ {file_path} (文件不存在)")

print()

# 计算文件大小
zip_size = os.path.getsize(output_zip)
print(f"打包完成: {output_zip}")
print(f"文件大小: {zip_size:,} bytes ({zip_size/1024:.1f} KB)")

# 计算 MD5
with open(output_zip, 'rb') as f:
    md5_hash = hashlib.md5(f.read()).hexdigest().upper()
print(f"MD5: {md5_hash}")

# 验证 zip 文件
print()
print("=== 验证 zip 文件内容 ===")
with zipfile.ZipFile(output_zip, 'r') as zipf:
    for name in zipf.namelist():
        info = zipf.getinfo(name)
        print(f"  {name} ({info.file_size:,} bytes)")
