"""Speaks the tour with Kokoro (open model, Apache 2.0), one clip per step. No customer data and no cloud service.

Usage: narrate.py <kokoro-v1.0.onnx> <voices-v1.0.bin> <public/tutorial> <durations.json>
Needs: pip install kokoro-onnx soundfile, and ffmpeg. The model files come from the kokoro-onnx GitHub releases.
The narration text is steps.cjs (title + text), with product names respelled so they are said correctly.
"""
import json, os, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro

VOICE, SPEED = 'af_heart', 0.94   # a clear American female voice, slightly slower than default
model, voices, out, durations_path = sys.argv[1:5]
here = os.path.dirname(os.path.abspath(__file__))
steps = json.loads(subprocess.check_output(['node', os.path.join(here, 'steps.cjs')]))
kokoro = Kokoro(model, voices)
os.makedirs(out, exist_ok=True)
durations = {}
for step in steps:
    samples, rate = kokoro.create(step['say'], voice=VOICE, speed=SPEED, lang='en-us')
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as wav:
        sf.write(wav.name, samples, rate)
    target = os.path.join(out, f"{step['id']}.mp3")
    # Trim silence at both ends, even out loudness (-16 LUFS, speech), mono 64 kb/s.
    subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav.name, '-af',
        'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,'
        'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse,'
        'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100',
        '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', target])
    os.unlink(wav.name)
    seconds = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', target]))
    durations[step['id']] = round(seconds * 1000)
    print(f"{step['id']:14s} {seconds:5.2f}s {os.path.getsize(target) // 1024:3d} KB  {step['say']}")
json.dump(durations, open(durations_path, 'w'), indent=2)
print('total', round(sum(durations.values()) / 1000, 1), 's')
