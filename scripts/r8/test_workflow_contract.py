"""Guard R8 workflow status-expression and cleanup boundaries (no runner access)."""
from pathlib import Path
import re
import unittest

WORKFLOW = Path(__file__).resolve().parents[2] / ".github/workflows/android-r8-experiment.yml"

class WorkflowContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = WORKFLOW.read_text()
        cls.steps = re.split(r"(?m)^      - name: ", cls.source)

    def step(self, name):
        matches = [x for x in self.steps if x.startswith(name + "\n")]
        self.assertEqual(len(matches), 1)
        return matches[0]

    def test_status_functions_only_in_if_expressions(self):
        for line in self.source.splitlines():
            if re.search(r"\$\{\{[^}]*\b(?:always|cancelled|failure|success)\(\)", line):
                self.assertTrue(line.lstrip().startswith("if:"), line)

    def test_normal_drift_fails_without_restoring(self):
        step = self.step("Verify temporary configuration restored")
        self.assertIn("always() && !cancelled()", step)
        self.assertIn("git diff --exit-code -- android/settings.gradle android/app/proguard-rules.pro", step)
        self.assertNotIn("git restore", step)

    def test_cancel_cleanup_scoped_to_two_paths(self):
        step = self.step("Restore experiment-owned paths after cancellation only")
        self.assertIn("if: cancelled()", step)
        self.assertIn("git restore --source=HEAD --worktree -- android/settings.gradle android/app/proguard-rules.pro", step)
        self.assertIn("no acceptance credit", step)

    def test_both_variants_use_the_same_supported_renderer(self):
        for variant in ("baseline", "candidate"):
            step = self.step("Offline emulator acceptance on DEFAULT release " + variant)
            self.assertIn("-gpu lavapipe -feature -Vulkan", step)
            self.assertNotIn("swiftshader_indirect", step)
            self.assertIn("force-avd-creation: true", step)

    def test_candidate_runs_independently_but_pair_remains_mandatory(self):
        step = self.step("Offline emulator acceptance on DEFAULT release candidate")
        self.assertIn("id: candidate-acceptance", step)
        self.assertIn("!cancelled() && steps.default-build.outcome == 'success'", step)
        self.assertNotIn("steps.baseline-acceptance.outcome == 'success'", step)
        self.assertNotIn("continue-on-error", step)
        gate = self.step("Require both actual emulator acceptance results")
        self.assertIn('test "$BASELINE_OUTCOME" = success', gate)
        self.assertIn('test "$CANDIDATE_OUTCOME" = success', gate)
        for variant in ("baseline", "candidate"):
            self.assertIn('test -s "$R8_OUTPUT/default/' + variant + '/device/passed.txt"', gate)

if __name__ == "__main__":
    unittest.main()
