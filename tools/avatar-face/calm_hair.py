"""Calm a VRoid avatar's hair and clothes physics for signing.

VRoid hair swings freely ("spring bones") and is pushed by the arms and hands.
In signing, the hands move fast and often touch the face, so the hair flies
out and hides or distracts from the hands.

Default ("still"): hair physics is removed, so hair moves only with the head.
Calmest; on Dayya, tested on a 30 s signing clip, it looked natural.

--soft: hair keeps physics but is stiffer, slower and heavier, and the arms and
hands no longer push it. Long hair still swings when the head tilts (Dayya's
longest strands: 45 cm -> 33 cm), so this is only for short hair.

Both modes damp the top's hem. Only physics settings change; shapes, colours
and expressions stay as they are.

Usage:
  python calm_hair.py IN.vrm OUT.vrm [--soft]
Only the standard library is needed.
"""

import sys
from pathlib import Path

from add_face_shapes import read_glb, write_glb

HAIR = {"stiffness_x": 3.0, "stiffness_min": 2.5, "stiffness_max": 4.0, "drag": 0.95, "gravity": 0.4}
CLOTH = {"stiffness_x": 2.0, "stiffness_min": 1.5, "stiffness_max": 4.0, "drag": 0.8, "gravity": 0.0}
LIMB_WORDS = ("UpperArm", "LowerArm", "Hand")


def calm_joint(joint, s):
    joint["stiffness"] = round(min(s["stiffness_max"], max(s["stiffness_min"], joint.get("stiffness", 1.0) * s["stiffness_x"])), 4)
    joint["dragForce"] = max(joint.get("dragForce", 0.5), s["drag"])
    if s["gravity"]:
        joint["gravityPower"] = max(joint.get("gravityPower", 0.0), s["gravity"])
        joint["gravityDir"] = [0, -1, 0]


def is_hair(j, spring):
    first = j["nodes"][spring["joints"][0]["node"]].get("name", "")
    return "hair" in (spring.get("name", "") + " " + first).lower()


def calm(j, soft=False):
    sb = j.get("extensions", {}).get("VRMC_springBone")
    if not sb:
        raise SystemExit("No VRM 1.0 spring bones in this avatar (VRoid Studio: export as VRM 1.0).")
    nodes = j["nodes"]
    groups = sb.get("colliderGroups", [])

    def is_limb(gi):
        names = [nodes[sb["colliders"][c]["node"]].get("name", "") for c in groups[gi]["colliders"]]
        return any(w in n for n in names for w in LIMB_WORDS)

    hair = cloth = 0
    if not soft:
        hair = sum(1 for sp in sb.get("springs", []) if is_hair(j, sp))
        sb["springs"] = [sp for sp in sb.get("springs", []) if not is_hair(j, sp)]
    for spring in sb.get("springs", []):
        first = nodes[spring["joints"][0]["node"]].get("name", "")
        name = (spring.get("name", "") + " " + first).lower()
        if "hair" in name:
            settings, hair = HAIR, hair + 1
            if "colliderGroups" in spring:
                spring["colliderGroups"] = [g for g in spring["colliderGroups"] if not is_limb(g)]
        elif "bust" in name:
            continue
        else:
            settings, cloth = CLOTH, cloth + 1
        for joint in spring["joints"]:
            calm_joint(joint, settings)
    return hair, cloth


def main(argv):
    soft = "--soft" in argv
    argv = [a for a in argv if a != "--soft"]
    if len(argv) != 3:
        print(__doc__)
        return 2
    src, dst = Path(argv[1]), Path(argv[2])
    if src.resolve() == dst.resolve():
        raise SystemExit("Write to a new file; the original is kept.")
    j, rest = read_glb(src)
    hair, cloth = calm(j, soft)
    write_glb(dst, j, rest)
    how = "softened" if soft else "made still (moves with the head)"
    print(f"Hair: {hair} springs {how}. Clothes: {cloth} springs damped. Saved {dst.name}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
