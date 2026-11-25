# Signer contribution note

My signer code is **`P2`**.

Each person records with a distinct code, such as `P1`, `P2`, or `P3`. Copy each person’s `contributions/<signer>/` folder into the same project’s `contributions/` folder, then run `python build_dataset.py`.

Evaluate each signer in turn with `python train_model.py --holdout P3` (and repeat for `P1` and `P2`).
