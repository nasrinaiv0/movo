"""Joins the recorded segments and the narration into public/tutorial/movo-guide.mp4 (see README.md)."""
import subprocess
segs = [('s1', 5.9), ('s2', 9.4), ('s3', 8.5), ('s4', 5.8), ('s5', 5.9), ('s6', 7.7), ('s7a', 4.7), ('s7b', 4.7), ('s8a', 3.6), ('s8b', 6.0)]
chap = [0, 5.9, 15.3, 23.8, 29.6, 35.5, 43.2, 52.6]
total = sum(d for _, d in segs)
inputs = [a for n, _ in segs for a in ('-i', f'segments/{n}.mp4')] + [a for i in range(1, 9) for a in ('-i', f'audio/{i}.mp3')]
f, prev, acc = [], '[0:v]', 0
for k in range(1, len(segs)):
    acc += segs[k - 1][1]
    f.append(f'{prev}[{k}:v]xfade=transition=fade:duration=0.4:offset={acc:.3f}[v{k}]'); prev = f'[v{k}]'
f.append(f'{prev}fade=t=in:st=0:d=0.5,fade=t=out:st={total - 0.6:.2f}:d=0.6,format=yuv420p[vout]')
for i in range(8):
    ms = int((chap[i] + 0.6) * 1000)
    f.append(f'[{len(segs) + i}:a]aresample=48000,adelay={ms}|{ms}[a{i}]')
f.append(''.join(f'[a{i}]' for i in range(8)) + f'amix=inputs=8:normalize=0,apad,atrim=0:{total:.2f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,afade=t=out:st={total - 0.8:.2f}:d=0.8[aout]')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(f), '-map', '[vout]', '-map', '[aout]',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p', '-r', '30',
                '-c:a', 'aac', '-b:a', '96k', '-ac', '1', '-movflags', '+faststart', '-t', f'{total:.2f}', 'movo-guide.mp4'], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '1.2', '-i', 'movo-guide.mp4', '-frames:v', '1', '-q:v', '4', 'movo-guide.jpg'], check=True)
