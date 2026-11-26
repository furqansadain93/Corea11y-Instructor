"""Add the 52 ARKit face expressions ("perfect sync") to a VRoid avatar.

VRoid exports about 57 face shapes (Fcl_BRW_Angry, Fcl_MTH_U, Fcl_EYE_Close_L…)
but only 15 basic expressions. The Avatar Lab drives every MediaPipe face value
one-to-one when an avatar has expressions named like ARKit (jawOpen,
browInnerUp, …). This script builds those 52 expressions from the shapes the
avatar already has. No geometry is changed, so it is safe and repeatable.

Limits: VRoid's eyebrow and mouth shapes move both sides together, so the
Left/Right pairs share one shape at half strength each (a single raised brow
shows as both brows half raised). A few ARKit shapes have no VRoid source and
are added empty (cheekPuff, tongueOut, jaw sideways, eye look: the lab moves the
eyes with look-at instead).

Usage:
  python add_face_shapes.py IN.vrm OUT.vrm
Only the standard library is needed.
"""

import json
import struct
import sys
from pathlib import Path

# ARKit name -> list of (VRoid shape, weight). Pairs marked Left/Right that use a
# both-sides shape get half weight each, so both together give the full shape.
H = 0.5
MAP = {
    # Eyebrows
    "browDownLeft": [("Fcl_BRW_Angry", H)],
    "browDownRight": [("Fcl_BRW_Angry", H)],
    "browInnerUp": [("Fcl_BRW_Sorrow", 1.0)],
    "browOuterUpLeft": [("Fcl_BRW_Surprised", H)],
    "browOuterUpRight": [("Fcl_BRW_Surprised", H)],
    # Eyes
    "eyeBlinkLeft": [("Fcl_EYE_Close_L", 1.0)],
    "eyeBlinkRight": [("Fcl_EYE_Close_R", 1.0)],
    "eyeSquintLeft": [("Fcl_EYE_Joy_L", 0.35)],
    "eyeSquintRight": [("Fcl_EYE_Joy_R", 0.35)],
    "eyeWideLeft": [("Fcl_EYE_Surprised", H)],
    "eyeWideRight": [("Fcl_EYE_Surprised", H)],
    "eyeLookDownLeft": [], "eyeLookDownRight": [], "eyeLookInLeft": [], "eyeLookInRight": [],
    "eyeLookOutLeft": [], "eyeLookOutRight": [], "eyeLookUpLeft": [], "eyeLookUpRight": [],
    # Cheeks and nose
    "cheekPuff": [],
    "cheekSquintLeft": [("Fcl_EYE_Joy_L", 0.2)],
    "cheekSquintRight": [("Fcl_EYE_Joy_R", 0.2)],
    "noseSneerLeft": [("Fcl_EYE_Angry", 0.25 * H), ("Fcl_BRW_Angry", 0.2 * H)],
    "noseSneerRight": [("Fcl_EYE_Angry", 0.25 * H), ("Fcl_BRW_Angry", 0.2 * H)],
    # Jaw
    "jawOpen": [("Fcl_MTH_A", 1.0)],
    "jawForward": [], "jawLeft": [], "jawRight": [],
    # Mouth
    "mouthClose": [],
    "mouthFunnel": [("Fcl_MTH_O", 1.0)],
    "mouthPucker": [("Fcl_MTH_U", 0.8), ("Fcl_MTH_Small", 0.5)],
    "mouthLeft": [], "mouthRight": [],
    "mouthSmileLeft": [("Fcl_MTH_Fun", H)],
    "mouthSmileRight": [("Fcl_MTH_Fun", H)],
    "mouthFrownLeft": [("Fcl_MTH_Down", H)],
    "mouthFrownRight": [("Fcl_MTH_Down", H)],
    "mouthDimpleLeft": [("Fcl_MTH_Up", 0.2 * H)],
    "mouthDimpleRight": [("Fcl_MTH_Up", 0.2 * H)],
    "mouthStretchLeft": [("Fcl_MTH_I", 0.35 * H)],
    "mouthStretchRight": [("Fcl_MTH_I", 0.35 * H)],
    "mouthRollLower": [("Fcl_MTH_Small", 0.3)],
    "mouthRollUpper": [("Fcl_MTH_Small", 0.3)],
    "mouthShrugLower": [("Fcl_MTH_Angry", 0.4)],
    "mouthShrugUpper": [("Fcl_MTH_Angry", 0.2)],
    "mouthPressLeft": [("Fcl_MTH_Angry", 0.25 * H)],
    "mouthPressRight": [("Fcl_MTH_Angry", 0.25 * H)],
    "mouthLowerDownLeft": [("Fcl_MTH_E", 0.25 * H)],
    "mouthLowerDownRight": [("Fcl_MTH_E", 0.25 * H)],
    "mouthUpperUpLeft": [("Fcl_MTH_I", 0.2 * H)],
    "mouthUpperUpRight": [("Fcl_MTH_I", 0.2 * H)],
    "tongueOut": [],
}
assert len(MAP) == 52, len(MAP)


def read_glb(path):
    b = Path(path).read_bytes()
    magic, version, total = struct.unpack("<4sII", b[:12])
    if magic != b"glTF" or version != 2:
        raise SystemExit("Not a VRM/glTF 2 binary file.")
    jlen, jtype = struct.unpack("<I4s", b[12:20])
    if jtype != b"JSON":
        raise SystemExit("First chunk is not JSON.")
    j = json.loads(b[20:20 + jlen])
    rest = b[20 + jlen:]  # BIN chunk (length, type, data) kept byte for byte
    return j, rest


def write_glb(path, j, rest):
    data = json.dumps(j, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    data += b" " * ((4 - len(data) % 4) % 4)
    body = struct.pack("<I4s", len(data), b"JSON") + data + rest
    Path(path).write_bytes(struct.pack("<4sII", b"glTF", 2, 12 + len(body)) + body)


def face_node_and_names(j):
    """The node whose mesh carries the Fcl_ face shapes, and the shape names."""
    for ni, node in enumerate(j["nodes"]):
        mi = node.get("mesh")
        if mi is None:
            continue
        mesh = j["meshes"][mi]
        names = (mesh.get("extras") or {}).get("targetNames") or (mesh["primitives"][0].get("extras") or {}).get("targetNames")
        if names and any(n.startswith("Fcl_") for n in names):
            return ni, names
    raise SystemExit("No VRoid face shapes (Fcl_...) found in this avatar.")


def add_face_shapes(j):
    vrm = j.get("extensions", {}).get("VRMC_vrm")
    if not vrm:
        raise SystemExit("Only VRM 1.0 avatars are supported (VRoid Studio: export as VRM 1.0).")
    node, names = face_node_and_names(j)
    index = {n: i for i, n in enumerate(names)}
    custom = vrm.setdefault("expressions", {}).setdefault("custom", {})
    missing, added = set(), 0
    for arkit, binds in MAP.items():
        mt = []
        for shape, w in binds:
            if shape in index:
                mt.append({"node": node, "index": index[shape], "weight": round(w, 4)})
            else:
                missing.add(shape)
        custom[arkit] = {"morphTargetBinds": mt, "isBinary": False,
                         "overrideBlink": "none", "overrideLookAt": "none", "overrideMouth": "none"}
        added += 1
    meta = vrm.setdefault("meta", {})
    meta["version"] = (str(meta.get("version", "")) + " +52 face").strip()
    return added, sorted(missing), sum(1 for b in MAP.values() if not b)


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    src, dst = Path(argv[1]), Path(argv[2])
    if src.resolve() == dst.resolve():
        raise SystemExit("Write to a new file; the original is kept.")
    j, rest = read_glb(src)
    added, missing, empty = add_face_shapes(j)
    write_glb(dst, j, rest)
    print(f"Added {added} face expressions ({added - empty} driven by the avatar's shapes, {empty} empty) to {dst.name}.")
    if missing:
        print("Shapes not found in this avatar (those parts stay still): " + ", ".join(missing))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
