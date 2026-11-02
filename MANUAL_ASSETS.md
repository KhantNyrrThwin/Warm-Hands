# Manual asset handoff

Some training assets are kept outside Git because they are data/model files. The file `manual-assets.zip` contains:

- `data/international5/` and `data/myanmar5/` training samples
- `models/*.pt` PyTorch checkpoints

## Send and install

1. Send `manual-assets.zip` to the recipient in Telegram. If Telegram refuses the upload, split the ZIP into smaller parts or use Telegram's file attachment option.
2. The recipient downloads the ZIP into the root of their Warm Hands project checkout (the same folder that contains `package.json`).
3. They extract the ZIP there and allow it to merge with the existing `data` and `models` folders. The archive already has those folders at its root.
4. They keep the extracted files in place; do not add them to Git.

To refresh the archive after collecting new samples or checkpoints, replace its contents with the two `data` folders and the `.pt` files in `models`.
