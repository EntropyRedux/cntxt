import os
import sys
import shutil
import subprocess
from PIL import Image
import numpy as np

raw_image = r'C:\Users\mbula\.gemini\antigravity-ide\brain\b536ffd7-aafd-465b-ab2f-eb09628b7864\.user_uploaded\media_1791027289446.png'
cntxt_dir = 'c:/Projects/LocalActive/Repo/Active/CNTXT'
cntxt_web_dir = 'c:/Projects/LocalActive/Repo/Active/cntxt-web'

print('=====================================================')
print('=== STEP 1: IMAGE PRE-PROCESSING & CENTERING      ===')
print('=====================================================')
if not os.path.exists(raw_image):
    print(f'ERROR: Raw image not found at {raw_image}')
    sys.exit(1)

img = Image.open(raw_image)
print(f'Input image size: {img.size}, mode: {img.mode}')

if img.mode != 'RGBA':
    img = img.convert('RGBA')

# 1. Detect content bounding box from alpha channel
bbox = img.getbbox()
print(f'Detected content bounding box: {bbox}')
cropped = img.crop(bbox)

# 2. Scale to fit with safe-zone margin (max dimension 880px inside 1024)
# This provides ~8% breathing room so circular & squircle masks never clip artwork
target_max_dim = 880
cw, ch = cropped.size
scale = target_max_dim / max(cw, ch)
new_w = int(round(cw * scale))
new_h = int(round(ch * scale))
scaled_content = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

# 3. Center on 1024x1024 transparent RGBA master canvas
master_1024 = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
offset_x = (1024 - new_w) // 2
offset_y = (1024 - new_h) // 2
master_1024.paste(scaled_content, (offset_x, offset_y), scaled_content)

scratch_dir = os.path.join(cntxt_dir, 'scratch')
os.makedirs(scratch_dir, exist_ok=True)
master_path = os.path.join(scratch_dir, 'master_icon_1024.png')
master_1024.save(master_path, 'PNG', optimize=True)
print(f'[OK] Master 1024x1024 transparent PNG generated at: {master_path}')

# 512x512 icon
icon_512 = master_1024.resize((512, 512), Image.Resampling.LANCZOS)
# 32x32 favicon
favicon_32 = master_1024.resize((32, 32), Image.Resampling.LANCZOS)
# Multi-resolution favicon.ico
favicon_ico_path = os.path.join(scratch_dir, 'favicon.ico')
master_1024.save(favicon_ico_path, format='ICO', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64)])
print('[OK] Multi-resolution favicon.ico generated with sizes: 16, 24, 32, 48, 64')

print('\n=====================================================')
print('=== STEP 2: RUNNING TAURI ICON GENERATOR          ===')
print('=====================================================')
tauri_icons_dir = os.path.join(cntxt_dir, 'src-tauri', 'icons')
res = subprocess.run(
    f'npx @tauri-apps/cli icon "{master_path}" --ios-color "#141417" -o "{tauri_icons_dir}"',
    shell=True,
    cwd=cntxt_dir,
    capture_output=True,
    text=True
)
if res.returncode != 0:
    print('Tauri CLI Error:', res.stderr)
    sys.exit(res.returncode)
else:
    print(res.stdout)
    print('[OK] Tauri desktop, iOS, and Android mipmap icons generated in:', tauri_icons_dir)

print('\n=====================================================')
print('=== STEP 3: IMPLEMENTATION & DISTRIBUTION        ===')
print('=====================================================')
# 1. CNTXT public/
cntxt_public = os.path.join(cntxt_dir, 'public')
master_1024.save(os.path.join(cntxt_public, 'logo.png'), 'PNG', optimize=True)
icon_512.save(os.path.join(cntxt_public, 'icon.png'), 'PNG', optimize=True)
favicon_32.save(os.path.join(cntxt_public, 'favicon-32x32.png'), 'PNG', optimize=True)
shutil.copy2(favicon_ico_path, os.path.join(cntxt_public, 'favicon.ico'))
master_1024.save(os.path.join(cntxt_dir, 'cntxt-logo.png'), 'PNG', optimize=True)
print('[OK] Updated CNTXT/public/ [logo.png, icon.png, favicon-32x32.png, favicon.ico] and CNTXT/cntxt-logo.png')

# 2. cntxt-web public/
web_public = os.path.join(cntxt_web_dir, 'public')
if os.path.exists(web_public):
    master_1024.save(os.path.join(web_public, 'logo.png'), 'PNG', optimize=True)
    icon_512.save(os.path.join(web_public, 'icon.png'), 'PNG', optimize=True)
    favicon_32.save(os.path.join(web_public, 'favicon-32x32.png'), 'PNG', optimize=True)
    shutil.copy2(favicon_ico_path, os.path.join(web_public, 'favicon.ico'))
    print('[OK] Updated cntxt-web/public/ [logo.png, icon.png, favicon-32x32.png, favicon.ico]')

# 3. Android gen res/
android_res = os.path.join(cntxt_dir, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res')
if os.path.exists(android_res):
    android_icons_src = os.path.join(tauri_icons_dir, 'android')
    for mipmap in ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi']:
        src_m = os.path.join(android_icons_src, mipmap)
        dst_m = os.path.join(android_res, mipmap)
        if os.path.exists(src_m) and os.path.exists(dst_m):
            for fname in os.listdir(src_m):
                shutil.copy2(os.path.join(src_m, fname), os.path.join(dst_m, fname))
    
    # Background xml
    bg_xml_src = os.path.join(android_icons_src, 'values', 'ic_launcher_background.xml')
    bg_xml_dst = os.path.join(android_res, 'values', 'ic_launcher_background.xml')
    if os.path.exists(bg_xml_src) and os.path.exists(os.path.dirname(bg_xml_dst)):
        shutil.copy2(bg_xml_src, bg_xml_dst)
    
    # Adaptive XMLs into mipmap-anydpi-v26
    anydpi_src = os.path.join(android_icons_src, 'mipmap-anydpi-v26')
    anydpi_dst = os.path.join(android_res, 'mipmap-anydpi-v26')
    if os.path.exists(anydpi_src) and os.path.exists(anydpi_dst):
        for fname in os.listdir(anydpi_src):
            shutil.copy2(os.path.join(anydpi_src, fname), os.path.join(anydpi_dst, fname))
            
    print('[OK] Synced all Android launcher icons to src-tauri/gen/android/app/src/main/res/ [mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi, anydpi-v26]')

# 4. Android gen assets/
android_assets = os.path.join(cntxt_dir, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'assets')
if os.path.exists(android_assets):
    master_1024.save(os.path.join(android_assets, 'logo.png'), 'PNG', optimize=True)
    icon_512.save(os.path.join(android_assets, 'icon.png'), 'PNG', optimize=True)
    favicon_32.save(os.path.join(android_assets, 'favicon-32x32.png'), 'PNG', optimize=True)
    shutil.copy2(favicon_ico_path, os.path.join(android_assets, 'favicon.ico'))
    print('[OK] Synced web assets to src-tauri/gen/android/app/src/main/assets/')

print('\n=====================================================')
print('=== ALL ICONS SUCCESSFULLY REPLACED ACROSS BUILDS ===')
print('=====================================================')
