# Friends workspace improvements

Contributor: Codex. PR #347.

Sent friend requests now retain their status when Friends is reopened. Senders can cancel a pending request. Conversation options let people select a received message for reporting after confirmation. Keyboard controls return focus when selection ends. Translations cover the new controls.

The changes reuse MOVO's existing Friends interface, navigation and services. The main implementation files are FriendsDiscovery.js, FriendMessages.js, FriendsController.js and the Friends API, with related tests and catalogs.

The [central PR progress entry](../../PR_PROGRESS.md) records validation, evidence and acceptance requirements.
