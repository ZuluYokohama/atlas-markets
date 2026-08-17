# Local training path (ESSN-TRAIN-v0)

Weights train on this machine (CPU AdamW). Path parameters: dataset, seed, epochs, batch, lr, weightDecay, gradClip, valFraction, earlyStopPatience.

```bash
npm run essn:train -- --dataset synthetic_planted --epochs 40
npm run essn:train -- --dataset development_f0 --epochs 20
```

Confirmation remains closed. `TRAINED_LOCAL_WEIGHTS` is not VALIDATED edge.
