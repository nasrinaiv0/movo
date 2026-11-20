# Erasure upgrade baseline — 2026-11-20

Finance CI correctly rejected the old pre-upgrade assumption that direct transaction mutations were still allowed. #328 is deployed and part of the baseline. The synthetic preflight now requires both raw UPDATE and DELETE to fail; restoring the pre-upgrade snapshot must retain those restrictions. No production schema, data, grants or security checks are weakened. Fresh disposable-container migration and snapshot-restore checks must pass at this commit.
