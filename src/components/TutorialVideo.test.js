import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'fs';
import path from 'path';
import TutorialVideo, { CHAPTERS, SCENES, TutorialScenes, chapterAt } from './TutorialVideo';

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, play, pause;
beforeEach(() => {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  play = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  pause = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { act(() => root.unmount()); host.remove(); play.mockRestore(); pause.mockRestore(); });
const button = (label) => [...host.querySelectorAll('button')].find(b => b.textContent === label || b.getAttribute('aria-label') === label);

describe('video guide (recording of the real app, narrated)', () => {
  test('plays the bundled recording with translated chapter captions; Next walks the chapters and Continue ends', () => {
    const done = jest.fn();
    act(() => root.render(<TutorialVideo onDone={done} />));
    const video = host.querySelector('video.tv-video');
    expect(video.getAttribute('src')).toBe('/tutorial/movo-guide.mp4');
    expect(video.getAttribute('poster')).toBe('/tutorial/movo-guide.jpg');
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(host.querySelector('[role="dialog"][aria-label="MOVO video guide"]')).not.toBeNull();
    expect(host.textContent).toContain('Welcome to MOVO');
    expect(host.textContent).toContain(`1 of ${CHAPTERS.length}`);
    for (let i = 1; i < CHAPTERS.length; i++) act(() => button('Next').click());
    expect(host.textContent).toContain(`${CHAPTERS.length} of ${CHAPTERS.length}`);
    expect(host.textContent).toContain('accept the Terms of Service and Privacy Policy');
    act(() => button('Continue').click());
    expect(done).toHaveBeenCalledWith('finished');
  });

  test('the recording plays on a phone screen with a status bar and home indicator; captions sit outside the phone', () => {
    act(() => root.render(<TutorialVideo onDone={() => {}} />));
    const device = host.querySelector('.tv-framed .tv-device');
    expect(device).not.toBeNull();
    const screen = device.querySelector('.tv-screen');
    expect(screen.querySelector('.tv-statusbar .tv-island')).not.toBeNull();
    expect(screen.querySelector('video.tv-video')).not.toBeNull();
    expect(screen.querySelector('.tv-homebar')).not.toBeNull();
    expect(device.querySelector('.tv-caption')).toBeNull();
    expect(host.querySelector('.tv-framed > .tv-caption')).not.toBeNull();
  });

  test('the chapters flash account deletion, the logo disclosure and the Terms', () => {
    const text = CHAPTERS.map(c => `${c.title} ${c.text}`).join(' ');
    expect(text).toMatch(/delete your account/);
    expect(text).toMatch(/logos only help you recognise your accounts/);
    expect(text).toMatch(/not affiliated/);
    expect(text).toMatch(/Terms of Service and Privacy Policy/);
  });

  test('Skip and Escape end it at once; Previous is off on the first chapter', () => {
    const done = jest.fn();
    act(() => root.render(<TutorialVideo onDone={done} />));
    expect(button('Previous').disabled).toBe(true);
    act(() => button('Skip').click());
    expect(done).toHaveBeenCalledWith('skipped');
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(done).toHaveBeenCalledTimes(2);
  });

  test('with reduced motion (and in tests) nothing plays until Play is pressed', async () => {
    act(() => root.render(<TutorialVideo onDone={() => {}} />));
    expect(play).not.toHaveBeenCalled();
    await act(async () => { button('Play').click(); });
    expect(play).toHaveBeenCalledTimes(1);
  });

  test('when sound is blocked it plays muted and offers the sound button', async () => {
    play.mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError'))).mockImplementationOnce(() => Promise.resolve());
    act(() => root.render(<TutorialVideo onDone={() => {}} />));
    await act(async () => { button('Play').click(); });
    expect(play).toHaveBeenCalledTimes(2);
    expect(host.querySelector('video').muted).toBe(true);
    expect(button('Turn sound on')).toBeDefined();
    act(() => button('Turn sound on').click());
    expect(host.querySelector('video').muted).toBe(false);
  });

  test('if the recording cannot load, the animated scenes play instead', () => {
    act(() => root.render(<TutorialVideo onDone={() => {}} />));
    act(() => { host.querySelector('video').dispatchEvent(new Event('error')); });
    expect(host.querySelector('video')).toBeNull();
    expect(host.querySelector('.tv-stage')).not.toBeNull();
    expect(host.textContent).toContain(`1 of ${SCENES.length}`);
  });

  test('chapter timing follows the recording', () => {
    expect(CHAPTERS.map(c => c.at)).toEqual([...CHAPTERS.map(c => c.at)].sort((a, b) => a - b));
    expect(chapterAt(0)).toBe(0);
    expect(chapterAt(CHAPTERS[3].at + 0.1)).toBe(3);
    expect(chapterAt(999)).toBe(CHAPTERS.length - 1);
    const file = path.join(process.cwd(), 'public', 'tutorial', 'movo-guide.mp4');
    const size = fs.statSync(file).size;
    expect(size).toBeGreaterThan(500000);
    expect(size).toBeLessThan(6 * 1024 * 1024); // small enough for the web and the app bundles
    expect(fs.existsSync(path.join(process.cwd(), 'public', 'tutorial', 'movo-guide.jpg'))).toBe(true);
  });
});

describe('animated fallback scenes', () => {
  test('play scene by scene; the last scene hands over to the walkthrough', () => {
    const done = jest.fn();
    act(() => root.render(<TutorialScenes onDone={done} />));
    expect(host.textContent).toContain('Welcome to MOVO');
    for (let i = 1; i < SCENES.length; i++) act(() => button('Next').click());
    expect(host.textContent).toContain('Your first month of Pro is free');
    act(() => button('Start the walkthrough').click());
    expect(done).toHaveBeenCalledWith('finished');
  });

  test('stay still and do not advance by themselves with reduced motion', () => {
    jest.useFakeTimers();
    try {
      const done = jest.fn();
      act(() => root.render(<TutorialScenes onDone={done} />));
      act(() => { jest.advanceTimersByTime(20000); });
      expect(host.textContent).toContain('1 of');
      expect(host.querySelector('.tv-stage.is-still')).not.toBeNull();
      expect(done).not.toHaveBeenCalled();
    } finally { jest.useRealTimers(); }
  });
});
