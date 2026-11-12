# 2026-11-12 — Receipt picker in the transaction sheet

## Request
"Improve the UI of this upload receipts". The Add Transaction sheet showed the browser's default file input ("Receipt attachment · Choose File · no file selected"), and that label was not translated.

## Change
- `src/components/TransactionSheet.js`: new `ReceiptField`.
  - **Empty:** a card with a dashed edge, a receipt icon, "Add receipt", "Photo or PDF · up to 10 MB" and an accent plus button. The real `<input type="file">` covers the card invisibly, so tapping anywhere opens the phone's picker (camera, photos or files), and keyboard and screen readers still reach it.
  - **Chosen:**
    - a thumbnail for photos (object URL, revoked when it changes or the sheet closes), or a document mark for PDFs;
    - the file name, size and where it is kept ("Stored with your cloud record" or "Saved on this device");
    - **Replace** and **Remove** (44px targets).
  - **Checks:** types other than JPG, PNG, WebP or PDF, and files over 10 MB, are refused at once with the existing translated message. The save still checks again.
  - **Editing a record that has a receipt:** it shows "Receipt attached". Remove clears it and sets `receipt_path_to_delete`. On save the record's receipt is cleared, and for cloud records the old file is deleted only after the save succeeds (existing logic in `App.js`).
- `src/App.css`: one appended block, "Receipt picker in the transaction sheet".
- `src/i18n/catalog/ui-2026-11-12-receipt.js`: "Add receipt", "Photo or PDF · up to 10 MB", "Replace" and "Remove receipt" in 11 languages. The other strings already existed.

## Validation
- `src/components/ReceiptField.test.js`:
  - the empty card;
  - a valid photo is attached, and an oversized PDF or a text file is refused;
  - a chosen file shows its name, size and location, with Replace and Remove;
  - removing a saved receipt marks it for deletion.
- Jest (full suite) and the strict build pass.
- Browser screenshots (Playwright, 430px, production build against the local mock cloud) of the empty and chosen states, in light and dark.
- Not run: real devices.

## Known limitation (unchanged)
A receipt kept only on the device (`localreceipt:`) is not removed from device storage when it is replaced or removed. The record no longer points to it.

## Rollback
Revert the commit.
