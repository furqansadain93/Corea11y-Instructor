import struct
import tempfile
import unittest
from pathlib import Path

import add_face_shapes as A

NAMES = ["Fcl_ALL_Neutral", "Fcl_BRW_Angry", "Fcl_BRW_Sorrow", "Fcl_MTH_A", "Fcl_MTH_U", "Fcl_MTH_Small"]


def tiny_vrm():
    return {
        "asset": {"version": "2.0"},
        "nodes": [{"name": "Body"}, {"name": "Face", "mesh": 0}],
        "meshes": [{"extras": {"targetNames": NAMES}, "primitives": [{}]}],
        "extensions": {"VRMC_vrm": {"meta": {"version": "1"}, "expressions": {"preset": {"happy": {}}}}},
    }


class AddFaceShapes(unittest.TestCase):
    def test_adds_52_bound_to_face_node(self):
        j = tiny_vrm()
        added, missing, empty = A.add_face_shapes(j)
        custom = j["extensions"]["VRMC_vrm"]["expressions"]["custom"]
        self.assertEqual(added, 52)
        self.assertEqual(len(custom), 52)
        self.assertEqual(empty, 16)
        jaw = custom["jawOpen"]["morphTargetBinds"]
        self.assertEqual(jaw, [{"node": 1, "index": 3, "weight": 1.0}])
        pucker = {b["index"]: b["weight"] for b in custom["mouthPucker"]["morphTargetBinds"]}
        self.assertEqual(pucker, {4: 0.8, 5: 0.5})
        self.assertIn("Fcl_EYE_Close_L", missing)
        self.assertIn("happy", j["extensions"]["VRMC_vrm"]["expressions"]["preset"])

    def test_pairs_add_up_to_full_shape(self):
        j = tiny_vrm()
        A.add_face_shapes(j)
        c = j["extensions"]["VRMC_vrm"]["expressions"]["custom"]
        total = sum(b["weight"] for n in ("browDownLeft", "browDownRight") for b in c[n]["morphTargetBinds"])
        self.assertAlmostEqual(total, 1.0)

    def test_glb_round_trip_keeps_binary(self):
        j = tiny_vrm()
        binary = b"\x01\x02\x03\x04" * 3
        rest = struct.pack("<I4s", len(binary), b"BIN\x00") + binary
        with tempfile.TemporaryDirectory() as d:
            src, dst = Path(d) / "a.vrm", Path(d) / "b.vrm"
            A.write_glb(src, j, rest)
            self.assertEqual(A.main(["x", str(src), str(dst)]), 0)
            j2, rest2 = A.read_glb(dst)
            self.assertEqual(rest2, rest)
            self.assertEqual(len(j2["extensions"]["VRMC_vrm"]["expressions"]["custom"]), 52)
            self.assertEqual(dst.stat().st_size % 4, 0)
            with self.assertRaises(SystemExit):
                A.main(["x", str(src), str(src)])


if __name__ == "__main__":
    unittest.main()
