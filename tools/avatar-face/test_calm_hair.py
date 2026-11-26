import unittest

import calm_hair as C


def tiny():
    names = ["J_Bip_C_Head", "J_Bip_L_Hand", "J_Sec_Hair1_01", "J_Sec_L_CoatSkirtBack_01"]
    return {
        "nodes": [{"name": n} for n in names],
        "extensions": {"VRMC_springBone": {
            "colliders": [{"node": 0}, {"node": 1}],
            "colliderGroups": [{"colliders": [0]}, {"colliders": [1]}],
            "springs": [
                {"name": "Hair", "joints": [{"node": 2, "stiffness": 0.4, "dragForce": 0.4}], "colliderGroups": [0, 1]},
                {"name": "TopsUpperArm", "joints": [{"node": 3, "stiffness": 0.77, "dragForce": 0}]},
            ]}},
    }


class CalmHair(unittest.TestCase):
    def test_still_removes_hair_springs_only(self):
        j = tiny()
        hair, cloth = C.calm(j)
        springs = j["extensions"]["VRMC_springBone"]["springs"]
        self.assertEqual((hair, cloth), (1, 1))
        self.assertEqual([s["name"] for s in springs], ["TopsUpperArm"])
        self.assertGreaterEqual(springs[0]["joints"][0]["dragForce"], 0.8)

    def test_soft_stiffens_and_drops_hand_colliders(self):
        j = tiny()
        C.calm(j, soft=True)
        hair = j["extensions"]["VRMC_springBone"]["springs"][0]
        self.assertEqual(hair["colliderGroups"], [0])
        self.assertGreaterEqual(hair["joints"][0]["stiffness"], 2.5)
        self.assertEqual(hair["joints"][0]["gravityDir"], [0, -1, 0])


if __name__ == "__main__":
    unittest.main()
