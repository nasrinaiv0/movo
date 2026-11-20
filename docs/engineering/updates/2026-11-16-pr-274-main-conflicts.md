# PR #274 conflict resolution

Preserved both finance vault keys and regressions, Friends isolation, current simulator recovery and billing behavior, and the PR’s erasure and retention coverage. Kept both privacy changes and regenerated static policies and locale output.

Merged main `77bcacc` into the feature branch. Validate the result at the updated PR head. This integration does not apply migrations or deploy production.

The staging rehearsal now applies all existing main migrations to its disposable baseline, including the newer Google Play isolation and Friends migrations, before applying the three pending PR migrations. Snapshot restore, legacy compatibility, original tenant-isolation tests, and the Friends deletion regression are still required.
