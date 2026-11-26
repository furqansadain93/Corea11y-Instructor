# Restyle a VRoid avatar (.vrm) for signing videos. Writes a new file; the
# original is not changed.
#  - solid navy top without tags, charcoal trousers
#  - darker and thicker eyebrows, deeper lip colour
#  - softer, rounder "3D cartoon" shading with a subtle rim light (instead of
#    flat anime shading)
#  - a "sweet" expression (soft closed smile, gentle open eyes, relaxed brows)
#    that the Avatar Lab uses as the resting face (Warmth slider)
# Usage: py recolour_vroid.py Dayya.vrm Dayya-colours.vrm   (needs: pip install numpy pillow)
# Colours: edit COLOURS below. Shading: edit SHADING below.
import json, struct, io, sys
import numpy as np
from PIL import Image, ImageFilter

COLOURS = {'top': '#1F2A44', 'trousers': '#46484F', 'brows': '#3A2A20', 'lips': '#C0636B'}

# MToon shading per material group. Lower "toony" = smoother light-to-shadow
# gradient (rounder look); shade colour = how dark the shadow side is; rim = a
# soft light on the edges that separates the figure from the background.
SHADING = {
    'cloth': dict(shadeColorFactor=[0.52, 0.55, 0.66], shadingToonyFactor=0.35, shadingShiftFactor=-0.15,
                  giEqualizationFactor=0.6, parametricRimColorFactor=[0.16, 0.19, 0.27],
                  parametricRimFresnelPowerFactor=3.5, parametricRimLiftFactor=0.05),
    'skin': dict(shadeColorFactor=[0.88, 0.68, 0.66], shadingToonyFactor=0.5, shadingShiftFactor=-0.05,
                 giEqualizationFactor=0.7, parametricRimColorFactor=[0.12, 0.09, 0.08],
                 parametricRimFresnelPowerFactor=4.0, parametricRimLiftFactor=0.05),
    'face': dict(shadeColorFactor=[0.9, 0.72, 0.7], shadingToonyFactor=0.55, shadingShiftFactor=0.3,
                 giEqualizationFactor=0.75, parametricRimColorFactor=[0.1, 0.08, 0.07],
                 parametricRimFresnelPowerFactor=4.0, parametricRimLiftFactor=0.05),
    'hair': dict(shadeColorFactor=[0.6, 0.55, 0.56], shadingToonyFactor=0.45, shadingShiftFactor=-0.1,
                 giEqualizationFactor=0.65, parametricRimColorFactor=[0.2, 0.17, 0.14],
                 parametricRimFresnelPowerFactor=3.0, parametricRimLiftFactor=0.05),
}

def group(name):
    if 'CLOTH' in name: return 'cloth'
    if 'Face_00_SKIN' in name: return 'face'
    if 'SKIN' in name: return 'skin'
    if 'HAIR' in name: return 'hair'
    return None

src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + jl])
bs = 20 + jl
bl = struct.unpack('<I', b[bs:bs + 4])[0]
bin_ = b[bs + 8:bs + 8 + bl]
views = [bin_[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']] for v in j['bufferViews']]

def mat_image(name_part):
    for m in j['materials']:
        if name_part in m['name']:
            t = m['pbrMetallicRoughness']['baseColorTexture']['index']
            return j['textures'][t]['source']
    raise KeyError(name_part)

def load(k):
    return Image.open(io.BytesIO(views[j['images'][k]['bufferView']])).convert('RGBA')

def store(k, img):
    out = io.BytesIO(); img.save(out, 'PNG', optimize=True)
    views[j['images'][k]['bufferView']] = out.getvalue()

def hexrgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)

# 1) Top: solid navy, keep soft shading, remove collar tab and hem tag.
k = mat_image('Tops')
im = np.asarray(load(k)).astype(np.float32)
rgb, a = im[..., :3], im[..., 3:]
lum = rgb.mean(axis=2) / 255.0
cloth = (a[..., 0] > 0) & (lum > 0.5)
med = np.median(lum[cloth])
# Anything darker or more coloured than the cloth (tab, tag, zip line) -> cloth tone.
sat = rgb.max(axis=2) - rgb.min(axis=2)
detail = (a[..., 0] > 0) & ((lum < med - 0.08) | (sat > 25))
lum2 = lum.copy()
lum2[detail] = med
lum2 = np.asarray(Image.fromarray((lum2 * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255.0
shade = np.clip(0.78 + 0.22 * (lum2 - med) / max(1e-3, 1 - med) + 0.22, 0.6, 1.0)
navy = hexrgb(COLOURS['top'])
im[..., :3] = navy[None, None, :] * shade[..., None]
store(k, Image.fromarray(np.clip(im, 0, 255).astype(np.uint8), 'RGBA'))
removed = int(detail.sum())

# 2) Brows: darker and a little thicker.
k = mat_image('FaceBrow')
img = load(k)
alpha = img.split()[3]
thick = alpha.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1))
al = np.maximum(np.asarray(alpha), (np.asarray(thick) * 0.9).astype(np.uint8))
brow = np.zeros((img.size[1], img.size[0], 4), np.uint8)
brow[..., :3] = hexrgb(COLOURS['brows']).astype(np.uint8)
brow[..., 3] = np.clip(al.astype(np.float32) * 1.15, 0, 255).astype(np.uint8)
store(k, Image.fromarray(brow, 'RGBA'))

# 3) Lips: deepen the lip colour on the face texture.
k = mat_image('Face_00_SKIN')
im = np.asarray(load(k)).astype(np.float32)
H, W = im.shape[:2]
skin = np.median(im[int(H * 0.55):int(H * 0.65), int(W * 0.35):int(W * 0.45), :3].reshape(-1, 3), axis=0)
# Lip pixels: redder than the skin (less green), in the lower middle of the face.
red = (im[..., 0] - im[..., 1]) - (skin[0] - skin[1])
mask = np.clip(red / 25.0, 0, 1)
ys, xs = np.mgrid[0:H, 0:W]
mask *= ((ys > H * 0.68) & (ys < H * 0.82) & (xs > W * 0.4) & (xs < W * 0.6)).astype(np.float32)
mask = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32) / 255.0
lip = hexrgb(COLOURS['lips'])
im[..., :3] = im[..., :3] * (1 - 0.7 * mask[..., None]) + lip[None, None, :] * (0.7 * mask[..., None])
store(k, Image.fromarray(np.clip(im, 0, 255).astype(np.uint8), 'RGBA'))
lip_px = int((mask > 0.3).sum())

# 4) Trousers: solid charcoal, keep soft shading.
k = mat_image('Bottoms')
im = np.asarray(load(k)).astype(np.float32)
lum = im[..., :3].mean(axis=2) / 255.0
cloth = im[..., 3] > 0
med = np.median(lum[cloth]) if cloth.any() else 0.5
shade = np.clip(1.0 + 0.6 * (lum - med), 0.6, 1.15)
im[..., :3] = hexrgb(COLOURS['trousers'])[None, None, :] * shade[..., None]
store(k, Image.fromarray(np.clip(im, 0, 255).astype(np.uint8), 'RGBA'))

# 5) Softer 3D cartoon shading.
styled = []
for m in j['materials']:
    g = group(m['name'])
    mt = m.get('extensions', {}).get('VRMC_materials_mtoon')
    if g and mt is not None:
        mt.update(SHADING[g])
        styled.append(g)

# 6) "sweet" resting expression from VRoid's face shapes.
SWEET = {'Fcl_ALL_Fun': 1.0, 'Fcl_MTH_Up': 0.4}  # VRoid's gentle smile (eyes stay open), corners a little higher
sweet_ok = False
for ni, node in enumerate(j['nodes']):
    if 'mesh' not in node: continue
    mesh = j['meshes'][node['mesh']]
    names = mesh.get('extras', {}).get('targetNames') or (mesh['primitives'][0].get('extras') or {}).get('targetNames') or []
    if all(n in names for n in SWEET):
        binds = [{'node': ni, 'index': names.index(n), 'weight': w} for n, w in SWEET.items()]
        ex = j['extensions']['VRMC_vrm'].setdefault('expressions', {}).setdefault('custom', {})
        ex['sweet'] = {'morphTargetBinds': binds, 'isBinary': False, 'overrideBlink': 'none', 'overrideLookAt': 'none', 'overrideMouth': 'none'}
        sweet_ok = True
        break

# Meta: mark the version.
meta = j['extensions']['VRMC_vrm']['meta']
meta['version'] = '0.1.3 restyled (navy top, charcoal trousers, darker brows and lips, soft 3D shading, sweet resting face)'

# Rebuild the binary chunk.
newbin = bytearray()
for i, v in enumerate(j['bufferViews']):
    while len(newbin) % 4: newbin.append(0)
    v['byteOffset'] = len(newbin)
    v['byteLength'] = len(views[i])
    newbin += views[i]
while len(newbin) % 4: newbin.append(0)
j['buffers'][0]['byteLength'] = len(newbin)
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
total = 12 + 8 + len(js) + 8 + len(newbin)
out = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(newbin)) + b'BIN\x00' + bytes(newbin)
open(dst, 'wb').write(out)
print('ok', len(out), 'detail px removed', removed, 'lip px', lip_px, 'styled', styled, 'sweet', sweet_ok)
