# PR #280 conflict resolution

Kept Wear quick-log and build targets alongside the isolated Android auth build, Friends, and legacy WebView URL parsing. Wear URLs still open only a blank phone form.

Merged main `77bcacc` into the feature branch. Validate the result at the updated PR head. This integration does not apply migrations or deploy production.

GitHub iOS CI surfaced an iPhone-only assumption in the distribution check after the Watch target was added. The updated contract checks both iPhone configurations and independently requires both watchOS configurations to use the MOVO Watch bundle and the matching iPhone companion identifier.
