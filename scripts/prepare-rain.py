"""Prepare the CC0 stereo recording listed in public/audio/CREDITS.txt.

Usage: python scripts/prepare-rain.py original.wav public/audio/rain-terrace.ogg
Offline build tool only; requires numpy and soundfile. No runtime dependency.
"""
import argparse
from pathlib import Path

import numpy as np
import soundfile as sf

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()

recording, rate = sf.read(args.source, always_2d=True)
assert recording.shape[1] == 2 and len(recording) >= 148 * rate
recording = recording[16 * rate:148 * rate].copy()
recording -= recording.mean(axis=0)

# Join the end into the beginning, leaving the middle of the field recording intact.
# Baking the seam avoids JavaScript scheduling gaps in background tabs.
overlap = 6 * rate
phase = np.linspace(0, np.pi / 2, overlap, endpoint=False)[:, None]
loop = recording[:-overlap].copy()
loop[:overlap] = recording[-overlap:] * np.cos(phase) + recording[:overlap] * np.sin(phase)

# One shared gain keeps the actual stereo image. Only rare close splashes are
# softened; no synthetic noise, reverb, fake stereo or dynamic auto-level pumping.
loop *= 4
loop = 0.72 * np.tanh(loop / 0.72)
# Leave headroom for Vorbis reconstruction around sharp droplets.
loop *= 0.85
args.output.parent.mkdir(parents=True, exist_ok=True)
with sf.SoundFile(args.output, "w", samplerate=rate, channels=2, format="OGG", subtype="VORBIS") as output:
    for start in range(0, len(loop), 4096):
        output.write(loop[start:start + 4096])

decoded, decoded_rate = sf.read(args.output, always_2d=True)
peak = float(np.max(np.abs(decoded)))
rms = float(np.sqrt(np.mean(decoded ** 2)))
seam = float(np.max(np.abs(decoded[0] - decoded[-1])))
adjacent = float(np.sqrt(np.mean(np.diff(decoded, axis=0) ** 2)))
assert decoded.shape[1] == 2 and decoded_rate == rate
assert np.isfinite(decoded).all() and peak < 0.95 and 0.03 < rms < 0.15
assert seam < adjacent * 6, "Loop boundary has an abnormal sample jump"
print({"duration": len(decoded) / rate, "channels": 2, "peak": round(peak, 4),
       "rms": round(rms, 4), "seam_jump": round(seam, 4),
       "stereo_correlation": round(float(np.corrcoef(decoded.T)[0, 1]), 4),
       "bytes": args.output.stat().st_size})
