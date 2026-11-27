"""Checks for the cleanup maths (no video or models needed).
Run from this folder:  .venv\\Scripts\\python -m unittest test_track -v
"""

import json
import math
import tempfile
import unittest
from pathlib import Path

import numpy as np

import track as T


def lm(x, y, z=0.0):
    return T._P(x, y, z)


class Gaps(unittest.TestCase):
    def test_short_gap_filled_linearly(self):
        a = np.arange(10, dtype=float).reshape(10, 1, 1).repeat(3, axis=2)
        a[3:6] = np.nan
        out, n = T.fill_gaps(a, 3)
        self.assertEqual(n, 3)
        np.testing.assert_allclose(out[:, 0, 0], np.arange(10))

    def test_long_gap_left_alone(self):
        a = np.ones((10, 1, 3))
        a[2:7] = np.nan
        out, n = T.fill_gaps(a, 3)
        self.assertEqual(n, 0)
        self.assertTrue(np.isnan(out[4]).all())

    def test_gap_at_the_end_not_invented(self):
        a = np.ones((6, 1, 3))
        a[4:] = np.nan
        out, n = T.fill_gaps(a, 3)
        self.assertEqual(n, 0)


class Smoothing(unittest.TestCase):
    def test_no_lag_on_a_ramp(self):
        # Two-way smoothing keeps a straight-line movement exactly where it is.
        a = np.linspace(0, 1, 40).reshape(40, 1, 1).repeat(3, axis=2)
        out = T.smooth(a, 2.0)
        np.testing.assert_allclose(out[7:-7], a[7:-7], atol=1e-9)

    def test_reduces_jitter(self):
        rng = np.random.default_rng(1)
        a = rng.normal(0, 0.01, (200, 1, 3))
        out = T.smooth(a, 1.5)
        self.assertLess(np.std(np.diff(out[:, 0, 0])), 0.5 * np.std(np.diff(a[:, 0, 0])))

    def test_missing_frames_stay_missing(self):
        a = np.ones((20, 1, 3))
        a[8:12] = np.nan
        out = T.smooth(a, 1.5)
        self.assertTrue(np.isnan(out[9]).all())
        self.assertFalse(np.isnan(out[3]).any())


class Hands(unittest.TestCase):
    def pose(self):
        p = [lm(0.5, 0.5) for _ in range(33)]
        p[T.L_SH], p[T.R_SH] = lm(0.6, 0.3), lm(0.4, 0.3)
        p[T.L_WR], p[T.R_WR] = lm(0.7, 0.6), lm(0.3, 0.6)
        return p

    def hand(self, x, y):
        return {"img": [lm(x, y)] * 21, "world": [lm(0, 0)] * 21}

    def test_assigned_by_nearest_wrist(self):
        a, b = self.hand(0.31, 0.6), self.hand(0.69, 0.61)
        left, right, rej = T.assign_hands(self.pose(), [a, b])
        self.assertIs(left, b)
        self.assertIs(right, a)
        self.assertEqual(rej, 0)

    def test_far_hand_rejected(self):
        far = self.hand(0.3, 0.05)  # up at the top of the picture, far from both wrists
        left, right, rej = T.assign_hands(self.pose(), [far])
        self.assertIsNone(left)
        self.assertIsNone(right)
        self.assertEqual(rej, 1)

    def test_holistic_hand_recentred(self):
        pts = T.centre_hand([lm(1.0, 2.0, 3.0), lm(1.2, 2.0, 3.0)])
        self.assertAlmostEqual(pts[0].x, -0.1)
        self.assertAlmostEqual(pts[1].x, 0.1)
        self.assertAlmostEqual(pts[0].z, 0.0)


class ArmDepth(unittest.TestCase):
    def clip(self, true_dz, guessed_dz, frames=30):
        """Right arm straight out to the side (in the picture plane) with a true
        forward depth, while MediaPipe 'guesses' a different depth."""
        W = H = 1000
        pw = np.zeros((frames, 33, 4))
        pi = np.zeros((frames, 33, 4))
        pw[:, :, 3] = pi[:, :, 3] = 1
        sh = 0.32  # shoulder width in metres; 320 px in the picture
        world = {T.L_SH: (sh / 2, 0, 0), T.R_SH: (-sh / 2, 0, 0)}
        for f in range(frames):
            ang = math.radians(20 + f)  # arm slowly rising
            side_on = f < 5  # the video starts with the arm side-on (relaxed)
            seg = 0.26
            # upper arm: in-plane part plus true depth; MediaPipe gets the depth wrong
            ex, ey = -sh / 2 - seg * math.cos(ang), seg * math.sin(ang) * -1
            if side_on:  # full length visible, no depth
                ex = -sh / 2 - math.hypot(seg * math.cos(ang), seg * math.sin(ang), true_dz)
                ey = 0.0
            el_true = (ex, ey, 0.0 if side_on else true_dz)
            wx, wy = ex - seg, ey
            if side_on:
                wx = ex - math.hypot(seg, true_dz)
            w_true = (wx, wy, 0.0 if side_on else 2 * true_dz)
            pts = dict(world)
            pts[T.R_EL] = (ex, ey, guessed_dz)
            pts[T.R_WR] = (wx, wy, 2 * guessed_dz)
            pts[T.L_EL] = (sh / 2 + seg, 0, 0)
            pts[T.L_WR] = (sh / 2 + 2 * seg, 0, 0)
            for k, (x, y, z) in pts.items():
                pw[f, k, :3] = (x, y, z)
            # picture: 1000 px per metre, centred; depth not visible
            truth = dict(world)
            truth.update({T.R_EL: el_true, T.R_WR: w_true, T.L_EL: pts[T.L_EL], T.L_WR: pts[T.L_WR]})
            for k, (x, y, _z) in truth.items():
                pi[f, k, :2] = (0.5 + x, 0.5 + y)
        return {"pose": pw, "poseImg": pi, "width": W, "height": H, "fps": 30.0}

    def test_flat_arm_depth_removed(self):
        # The arm really is flat (no depth) but MediaPipe says it reaches 25 cm forward.
        c = self.clip(true_dz=0.0, guessed_dz=-0.25)
        T.fix_arm_depth(c)
        dz = c["pose"][:, T.R_WR, 2] - c["pose"][:, T.R_SH, 2]
        self.assertLess(np.max(np.abs(dz)), 0.04)

    def test_forward_reach_kept(self):
        # A real forward reach: depth comes out close to the truth, not flattened.
        c = self.clip(true_dz=-0.12, guessed_dz=-0.20)
        before = c["poseImg"].copy()
        T.fix_arm_depth(c)
        dz_el = c["pose"][5:, T.R_EL, 2] - c["pose"][5:, T.R_SH, 2]
        self.assertTrue(np.all(np.abs(dz_el + 0.12) < 0.03), dz_el)
        np.testing.assert_array_equal(c["poseImg"], before)  # the picture is never changed


class MotionFile(unittest.TestCase):
    def test_lab_format(self):
        n = 3
        c = {"t": np.array([0.0, 0.033, 0.066]), "width": 640, "height": 480, "fps": 30.0, "video": "x.mp4", "mode": "separate",
             "pose": np.zeros((n, 33, 4)), "poseImg": np.zeros((n, 33, 4)),
             "hlW": np.full((n, 21, 3), np.nan), "hlI": np.full((n, 21, 3), np.nan),
             "hrW": np.zeros((n, 21, 3)), "hrI": np.zeros((n, 21, 3)),
             "face": np.zeros((n, len(T.FACE_IDX), 3)), "bs": np.array([[0.5, 0.001]] * n), "bsNames": ["jawOpen", "eyeBlinkLeft"]}
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "m.json"
            T.write_motion(c, {"frames": n}, p, "test")
            m = json.loads(p.read_text(encoding="utf-8"))
        self.assertEqual((m["format"], m["version"], m["bones"]), ("corea11y-motion", 1, []))
        f = m["frames"][0]
        self.assertEqual(f["q"], [])
        raw = f["raw"]
        self.assertEqual(len(raw["p"]), 33)
        self.assertEqual(len(raw["p"][0]), 4)
        self.assertEqual(len(raw["pi"][0]), 3)
        self.assertIsNone(raw["hl"])
        self.assertEqual(set(raw["hr"]), {"w", "i"})
        self.assertEqual(raw["f"]["i"], T.FACE_IDX)
        self.assertEqual(raw["bs"], {"jawOpen": 0.5})


class SideSwitch(unittest.TestCase):
    def test_brief_flicker_does_not_flip_the_arm(self):
        """The forearm is just in front of the picture plane, and MediaPipe puts
        it clearly behind for 2 frames (a flicker); the rebuilt arm stays in front."""
        W = H = 1000
        n = 40
        pw = np.zeros((n, 33, 4))
        pi = np.zeros((n, 33, 4))
        pw[:, :, 3] = pi[:, :, 3] = 1
        sh = 0.32
        for f in range(n):
            pts = {T.L_SH: (sh / 2, 0, 0), T.R_SH: (-sh / 2, 0, 0), T.L_EL: (sh / 2 + 0.26, 0, 0), T.L_WR: (sh / 2 + 0.52, 0, 0)}
            pts[T.R_EL] = (-sh / 2 - 0.26, 0, 0)  # upper arm out to the side
            side_on = f < 3
            fz = 0.0 if side_on else -0.04  # forearm 4 cm forward
            if 20 <= f < 22:
                fz = 0.3  # flicker: MediaPipe says well behind
            seen_x = -0.26 if side_on else -math.sqrt(0.26 ** 2 - 0.04 ** 2)
            pts[T.R_WR] = (-sh / 2 - 0.26 + seen_x, 0, fz)
            for k, (x, y, z) in pts.items():
                pw[f, k, :3] = (x, y, z)
                pi[f, k, :2] = (0.5 + x, 0.5 + y)
        c = {"pose": pw, "poseImg": pi, "width": W, "height": H, "fps": 30.0}
        T.fix_arm_depth(c)
        dz = c["pose"][3:, T.R_WR, 2] - c["pose"][3:, T.R_EL, 2]
        self.assertTrue(np.all(dz < 0), dz)

if __name__ == "__main__":
    unittest.main()
