from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import experiment


class RepositoryBackoffTests(unittest.TestCase):
    def test_retries_only_two_rate_limited_attempts_and_keeps_logs(self):
        error = ("Could not GET 'https://repo.maven.apache.org/maven2/a/a.pom'. "
                 "Received status code 429 from server: Too Many Requests")

        def gradle(args, log):
            log.write_text(error)
            raise subprocess.CalledProcessError(1, args)

        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / "build.log"
            with patch.object(experiment, "command", side_effect=gradle) as build:
                with patch.object(experiment.time, "sleep") as sleep:
                    with self.assertRaises(subprocess.CalledProcessError):
                        experiment.build_with_repository_backoff(["gradlew"], log)
            self.assertEqual(build.call_count, 3)
            self.assertEqual([call.args[0] for call in sleep.call_args_list], [60, 120])
            for name in ("build-rate-limited-60s.log", "build-rate-limited-120s.log", "build.log"):
                self.assertEqual(log.with_name(name).read_text(), error)

    def test_does_not_retry_compiler_errors(self):
        def gradle(args, log):
            log.write_text("ReleaseBridgeSmokeTest.java: error: cannot find symbol")
            raise subprocess.CalledProcessError(1, args)

        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(experiment, "command", side_effect=gradle) as build:
                with patch.object(experiment.time, "sleep") as sleep:
                    with self.assertRaises(subprocess.CalledProcessError):
                        experiment.build_with_repository_backoff(["gradlew"], Path(tmp) / "build.log")
            build.assert_called_once()
            sleep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
