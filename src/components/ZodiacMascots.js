import React, { memo } from 'react';
import AriesMascot from './AriesMascot';
import { ZODIAC } from '../lib/homeHero';
import './ZodiacMascots.css';

// Warm ivory faces, charcoal eyes and a small green accessory echo the MOVO ram.
const CREAM = '#f9efdd';
const LIGHT = '#fffaf0';
const INK = '#413e35';
const PALE_INK = '#716457';
const BLUSH = '#e5afa0';
const GREEN = '#3b6551';

function Eyes({ x = 120, y = 112, spacing = 21, smile = true }) {
  return <>
    <g className="zodiac-eyes">
      <ellipse cx={x - spacing} cy={y} rx="6.7" ry="9" fill={INK} />
      <ellipse cx={x + spacing} cy={y} rx="6.7" ry="9" fill={INK} />
      <g fill={LIGHT}>
        <circle cx={x - spacing - 2} cy={y - 3} r="2.15" />
        <circle cx={x + spacing - 2} cy={y - 3} r="2.15" />
      </g>
    </g>
    <g fill={BLUSH} opacity=".68">
      <ellipse cx={x - spacing - 11} cy={y + 13} rx="8.5" ry="4.5" />
      <ellipse cx={x + spacing + 11} cy={y + 13} rx="8.5" ry="4.5" />
    </g>
    {smile && <path d={`M${x - 5} ${y + 15}q5 7 10 0`} fill="none" stroke={INK} strokeWidth="2.35" strokeLinecap="round" />}
  </>;
}

function Scarf({ color = GREEN }) {
  return <>
    <path fill={color} d="M134 154q19 3 25 26-6 8-15 5l-15-21Z" />
    <path fill={color} d="M87 147q33 11 65 0l2 15q-32 15-68 1Z" />
    <path fill="none" stroke={LIGHT} strokeWidth="1.8" strokeLinecap="round" opacity=".47" d="M94 154q26 7 50 0" />
  </>;
}

function Taurus() {
  return <>
    <path fill="#a98065" d="M82 148q-21 18-16 46 4 16 25 17h59q19-2 23-18 4-28-17-45Z" />
    <path fill={PALE_INK} d="M77 192q14 4 27 0v15q-11 10-26 1Zm59 0q13 4 27 0l-1 15q-12 9-26 1Z" />
    <path fill="#c4a286" d="M93 155q27-10 54 0l5 25q-6 17-32 17t-32-17Z" />
    <g className="zodiac-gesture">
      <path fill="#a88164" d="M86 101C62 80 38 85 39 97c1 17 24 26 48 19Zm68 0c24-21 48-16 47-4-1 17-24 26-48 19Z" />
      <path fill="#d4a38d" d="M72 103q-16-13-26-7 4 13 27 15Zm95 0q17-13 27-7-5 13-28 15Z" />
      <path fill="#a19582" d="M94 81C66 83 46 64 46 42q1-13 6-14 6 30 27 33 8 2 15-2Zm52 0c28 2 48-17 48-39q-1-13-6-14-6 30-27 33-8 2-15-2Z" />
      <path fill="#d7cab2" d="M49 38q8 27 34 29l7-2-8 10Q54 72 49 38Zm142 0q-8 27-34 29l-7-2 8 10q28-3 33-37Z" />
      <path fill="#b18b6c" d="M69 104q-3-25 25-35 22-15 49-2 29 8 30 36 3 27-15 42-15 14-38 14t-38-14q-18-16-13-41Z" />
      <path fill="#c69e7f" d="M83 94q15-21 37-18 23-3 37 18l-2 24q-15 25-35 24t-36-24Z" />
      <path fill={CREAM} d="M92 128q7-11 28-10 21-1 28 10 7 19-13 25-16 5-32 0-19-7-11-25Z" />
      <path fill="#e8c8a6" d="M97 141q24 8 47-1-3 13-25 13-20-1-22-12Z" />
      <Eyes x={120} y={105} spacing={20} smile={false} />
      <path d="M106 134h2m24 0h2m-18 7q4 4 8 0" stroke={PALE_INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M111 84q9-4 18 0" fill="none" stroke={CREAM} strokeWidth="2.5" strokeLinecap="round" />
    </g>
    <Scarf />
  </>;
}

function Person({ hair, skin = CREAM, outfit = GREEN, trim = '#b8c4a0', style = 'short' }) {
  const long = style === 'long';
  return <>
    {long && <path fill={hair} d="M72 103q-5 42-24 61 21 14 46 5l55 1q22 8 43-6-18-22-24-64Z" />}
    <path fill={PALE_INK} d="M91 188h20l2 20q-13 8-24-1Zm37 0h21l3 19q-12 9-25 1Z" />
    <path fill={outfit} d="M87 141q-15 9-17 28l8 8-1 17q44 21 86 0l-1-17 8-8q-2-19-17-28Z" />
    <g fill={skin}><ellipse cx="72" cy="174" rx="10" ry="8" /><ellipse cx="168" cy="174" rx="10" ry="8" /></g>
    <path fill={trim} d="M88 176q30 12 63 0l-1 7q-29 12-61 1Z" />
    <path fill={trim} d="M100 147q20 11 40 0l-4 12-16 10-16-10Z" />
    <circle cx="120" cy="176" r="4.25" fill="#c9ac75" />
    <path fill={hair} d="M66 104q-9-27 10-44 20-22 48-17 28-5 45 19 14 18 5 50l-11 19H79Z" />
    <g fill={skin}><ellipse cx="78" cy="114" rx="10" ry="12" /><ellipse cx="162" cy="114" rx="10" ry="12" /></g>
    <path fill={skin} d="M82 88q9-24 37-24 28 0 39 24l3 28q-3 35-42 41-37-5-40-37Z" />
    <path fill={hair} d={long
      ? 'M75 92q1-38 25-40 19-10 44 2 25 13 25 50-22-11-39-31-16 24-55 28Z'
      : 'M75 97q-3-25 11-37 13-15 36-11 23-3 38 15l6 24q-13-5-25-14-17 14-34 11l7-9q-14 13-39 21Z'} />
    <path d="M92 69q13-13 31-12" stroke={LIGHT} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".35" />
    <Eyes x={120} y={111} spacing={17} />
  </>;
}

function Gemini() {
  return <>
    <g transform="translate(-16 19) scale(.78)">
      <g className="zodiac-gesture"><Person hair="#887661" style="long" outfit="#626f66" trim="#cacfba" /></g>
    </g>
    <g transform="translate(70 22) scale(.78)">
      <g className="zodiac-gesture zodiac-gesture--second"><Person hair="#5d4e45" skin="#f1d7bb" outfit="#536d60" trim="#b5c7a6" /></g>
    </g>
    <path fill="#c3a276" d="M120 49q3 12 12 15-10 2-12 14-2-12-12-14 9-3 12-15Z" />
  </>;
}

function Cancer() {
  const claw = <g>
    <path d="M87 153 57 139l-6-17" fill="none" stroke="#a66d5d" strokeWidth="12" strokeLinecap="round" />
    <path fill="#c48a72" d="M59 132q-22-4-30-26-8-20 7-31 3 18 15 22 1-17 12-24 14 12 13 34-1 16-17 25Z" />
    <path d="M37 85q-4 12 3 23" fill="none" stroke="#e4b098" strokeWidth="3" strokeLinecap="round" />
    <path fill="#a66d5d" d="M41 123q12 6 27-4-4 10-12 13Z" />
  </g>;
  return <>
    <path d="m81 156-27 5-10 13m37-4-25 13-3 13m37-14-17 19m86-45 27 5 10 13m-37-4 25 13 3 13m-37-14 17 19" fill="none" stroke="#a66d5d" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <g className="zodiac-gesture">{claw}</g>
    <g transform="translate(240 0) scale(-1 1)"><g className="zodiac-gesture">{claw}</g></g>
    <path fill="#bc8068" d="M70 149q-2-30 19-44 11-9 31-9t32 9q22 14 18 44-6 36-50 38-45-3-50-38Z" />
    <path fill="#dba188" d="M78 145q1-28 24-36 17-5 36 0 22 9 24 36-7 29-42 28-37 0-42-28Z" />
    <path fill="#f1c4a6" d="M90 157q29 15 60 0-6 21-30 21t-30-21Z" />
    <path d="M105 113q-14 5-18 16" fill="none" stroke="#eec3aa" strokeWidth="3" strokeLinecap="round" />
    <Eyes y={135} spacing={17} />
    <path fill={GREEN} d="m110 176 10-6 11 6-11 7Z" />
  </>;
}

function Leo() {
  return <>
    <g className="zodiac-gesture">
      <path d="M156 192q30 25 48-5 6-10 5-23" fill="none" stroke="#aa7752" strokeWidth="9" strokeLinecap="round" />
      <path fill="#9e6347" d="M201 164q-6-11 6-27 13 5 14 16 0 10-12 14Z" />
    </g>
    <path fill="#c89665" d="M86 149q-19 19-15 43 3 18 20 19h58q17-1 20-19 4-24-15-43Z" />
    <path fill="#f3d4ac" d="M100 156q20-10 40 0l7 23q-2 18-27 19t-27-19Z" />
    <path fill="#af794f" d="M81 190q-9 17-1 20 12 5 24-2l1-16m30 0 1 16q12 7 24 2 8-3-1-20" />
    <path fill="#a46d4c" d="M120 40q17-12 30 4 32-2 39 26 20 7 17 31 14 18-1 34 1 25-22 32-13 24-35 17-15 9-28-2-13 11-28 2-23 7-35-17-23-7-22-32-15-16-1-34-3-24 17-31 7-28 39-26 13-16 30-4Z" />
    <path fill="#b88055" d="M77 64q-24 7-20 27-22 18-12 43 6 19 24 19l13 18q14 4 27-1l22 1q17 6 28-2l11-17q20-2 26-20 9-22-13-42 2-19-20-26-31-21-86 0Z" />
    <g fill="#ddac77"><ellipse cx="82" cy="86" rx="18" ry="19" /><ellipse cx="158" cy="86" rx="18" ry="19" /></g>
    <g fill="#c88f70"><ellipse cx="81" cy="86" rx="10" ry="11" /><ellipse cx="159" cy="86" rx="10" ry="11" /></g>
    <path fill="#e4b983" d="M76 107q0-32 44-34 43 1 44 34 5 31-18 42-26 12-52 0-22-11-18-42Z" />
    <path fill={CREAM} d="M90 132q7-11 25-5l5 3 5-3q18-6 25 5 5 16-14 20-16 7-32 0-19-4-14-20Z" />
    <Eyes y={111} spacing={17} smile={false} />
    <path d="M114 130q6-3 12 0-1 5-6 6-5-1-6-6Z" fill={INK} />
    <path d="M120 135v4q-5 5-10 0m10 0q5 5 10 0" stroke={INK} strokeWidth="2.1" fill="none" strokeLinecap="round" />
    <Scarf />
  </>;
}

function Virgo() {
  return <>
    <Person hair="#7b6254" style="long" outfit="#698369" trim="#d9d9ac" />
    <g className="zodiac-gesture">
      <path d="M78 174q-16-22-19-52m18 47q-4-24 1-39" fill="none" stroke="#54735c" strokeWidth="3" strokeLinecap="round" />
      <path fill="#95a287" d="M62 148q-18-4-21-17 22 1 21 17Zm2-8q1-16 13-21 4 16-13 21Zm13 14q5-15 18-17-1 13-18 17Zm-8 5q-15 4-24-5 12-7 24 5Z" />
      <ellipse cx="72" cy="172" rx="8.5" ry="6.5" fill={CREAM} />
    </g>
    <g transform="translate(157 74)">
      <path d="M-10 1q-2-9 6-8 3-7 9-4 7 4 5 10 7 6 1 11-8 5-13 0-9 4-11-4Z" fill="#e7d0a3" />
      <circle r="4" fill="#a88655" />
    </g>
  </>;
}

function Libra() {
  const pan = <g>
    <path d="m0 0-13 20h26Z" fill="none" stroke="#947744" strokeWidth="2.6" strokeLinejoin="round" />
    <path d="M-15 20h30q-3 11-15 11t-15-11Z" fill="#c6a46a" />
    <path d="M-12 22h24" stroke="#efd7a1" strokeWidth="1.8" strokeLinecap="round" />
  </g>;
  return <>
    <path fill="#b5baaa" d="M86 153q-18-37-45-34-3 32 18 50 15 11 29 3Zm68 0q18-37 45-34 3 32-18 50-15 11-29 3Z" />
    <path d="M52 133q3 14 19 23m117-23q-3 14-19 23" fill="none" stroke="#f3edde" strokeWidth="3" strokeLinecap="round" />
    <Person hair="#a48965" outfit="#8d9784" trim="#e8d6a9" />
    <path fill="#e6c587" d="M109 66q8-5 11-12 2 7 11 12l-11 8Z" />
    <path d="M120 146v53m-10 0h20" fill="none" stroke="#927849" strokeWidth="5" strokeLinecap="round" />
    <g className="zodiac-gesture">
      <path d="M78 158q22-7 42-3 20-4 42 3" fill="none" stroke="#927849" strokeWidth="4" strokeLinecap="round" />
      <g transform="translate(79 159)">{pan}</g>
      <g transform="translate(161 159)">{pan}</g>
    </g>
    <circle cx="120" cy="155" r="5" fill="#ead19d" stroke="#927849" strokeWidth="2" />
  </>;
}

function Scorpio() {
  return <>
    <g className="zodiac-gesture">
      <path d="M151 146q37 9 51-26 11-29-8-47-15-14-33-4" fill="none" stroke="#796a7c" strokeWidth="19" strokeLinecap="round" />
      <path d="M154 142q35 5 46-25 10-25-8-42" fill="none" stroke="#aa90a3" strokeWidth="6" strokeLinecap="round" />
      <path d="m202 106 8 1m-13 17 8 4m-4-36 8-3m-16-9 4-6m-20-3 1-8" stroke="#5e5165" strokeWidth="2.8" strokeLinecap="round" />
      <path fill="#66576c" d="M166 61q-15-4-25 8 4 10 14 11l1-7 12-3Z" />
    </g>
    <path d="m82 159-25 13-8 15m38-15-18 24m90-37 25 13 8 15m-38-15 18 24" stroke="#776575" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path fill="#817080" d="M72 144q1-24 23-32 25-13 50 0 24 8 24 32-1 34-49 42-47-8-48-42Z" />
    <path fill="#a58b9f" d="M80 143q5-23 24-26 16-4 32 0 20 4 24 26-12 23-40 24-28 0-40-24Z" />
    <path d="M98 172q22 7 44 0" stroke="#6f5b73" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Eyes y={137} spacing={16} />
    <g fill="#9e8197">
      <path d="M74 160q-18 3-30-8-12-12-4-27l10 9 4-16q17 2 20 17l-3 7 13 6Z" />
      <path d="M166 160q18 3 30-8 12-12 4-27l-10 9-4-16q-17 2-20 17l3 7-13 6Z" />
    </g>
    <path fill="#c5a1b2" d="M47 141q7 10 20 6l-3 6q-13 1-17-12Zm146 0q-7 10-20 6l3 6q13 1 17-12Z" />
    <path fill={GREEN} d="m110 169 10-5 10 5-10 7Z" />
  </>;
}

function Sagittarius() {
  return <>
    <path fill="#8a6956" d="M158 170q24-13 34 3 10 11 4 23l-4 13h-11l-1-12h-16l-4 12h-11l-2-15Z" />
    <path d="M190 182q15 3 18-10" fill="none" stroke="#776154" strokeWidth="6" strokeLinecap="round" />
    <Person hair="#68574e" skin="#edcdb1" outfit="#68775d" trim="#d7be82" />
    <path d="M93 81q-14 0-23-9 2-7 11-5 2-10 16-12-5 15-4 26Z" fill="#af8e52" />
    <g className="zodiac-gesture" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M58 125q26 24 5 63" stroke="#ac8653" strokeWidth="5.5" />
      <path d="M58 125l-8 34 13 29" stroke="#796858" strokeWidth="2.25" />
      <path d="m46 160 46-6m-9-5 9 5-7 7" stroke="#6b5d51" strokeWidth="2.7" />
      <circle cx="72" cy="157" r="6.2" fill="#edcdb1" />
    </g>
  </>;
}

function Capricorn() {
  return <>
    <g className="zodiac-gesture">
      <path fill="#749286" d="M128 184q25 12 44-6 9-9 10-20l-6-15q18 3 25 16 8-10 21-9-2 21-20 28l-6 9q-14 40-58 32-18-4-27-18Z" />
      <path fill="#9eb29a" d="M160 204q31-5 38-31l-5-12 8 4q9-10 17-11-4 16-19 20-14 36-39 36Z" />
      <path d="M153 197q7 5 14 1m-1-9q6 5 13 0" fill="none" stroke="#5c7b6e" strokeWidth="2.4" strokeLinecap="round" />
    </g>
    <path fill="#b9ae91" d="M95 151q-18 14-19 38 4 21 38 24 36 2 44-19-2-27-19-43Z" />
    <path fill={CREAM} d="M100 164q21-7 40 0l4 27q-1 13-23 13-23 0-25-13Z" />
    <path fill="#817c70" d="M96 102Q70 91 67 58q-2-22 16-36-6 19 1 39 5 13 20 23Zm48 0q26-11 29-44 2-22-16-36 6 19-1 39-5 13-20 23Z" />
    <path d="M76 39q-9 21 8 45m80-45q9 21-8 45M70 64l11 3m-6 10 12 2m83-15-11 3m6 10-12 2" fill="none" stroke="#c1b8a3" strokeWidth="2.4" strokeLinecap="round" />
    <path fill="#d8c7a9" d="M94 104q-16-15-40-6 1 17 26 22m66-16q16-15 40-6-1 17-26 22" />
    <path fill="#efe0c5" d="M78 108q-2-26 25-29 10-8 21-2 22-4 30 14 12 6 11 19 6 21-10 33-12 13-35 13-25 0-36-13-15-11-6-35Z" />
    <path fill={LIGHT} d="M92 101q12-21 30-16 24-3 30 16l-4 19q-9 15-28 15t-28-15Z" opacity=".65" />
    <Eyes y={113} spacing={18} smile={false} />
    <path fill={PALE_INK} d="M115 126q5-3 10 0-1 5-5 6-4-1-5-6Z" />
    <path fill="#d8c7a9" d="M112 143h16q-1 16-8 18-7-2-8-18Z" />
    <path d="M115 135q5 5 10 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
    <Scarf />
  </>;
}

function Aquarius() {
  return <>
    <Person hair="#697d79" outfit="#52766f" trim="#abc7b3" />
    <g transform="rotate(-26 71 170)">
      <path d="M59 151q-22 3-16 19 4 10 17 8" fill="none" stroke="#847b66" strokeWidth="5.5" />
      <path fill="#a49b7e" d="M57 146h26l-5 11q15 10 14 25-4 13-22 13-19 0-22-13-1-15 14-25Z" />
      <path fill="#c9bfa1" d="M63 156h14v4q12 12 10 21-3 9-17 9-14 0-16-9-3-10 9-21Z" />
      <path fill="#8f856c" d="M54 144q16-4 32 0v6H54Z" />
      <path d="M54 176q18 7 32 0" stroke="#f0e5cc" strokeWidth="2" fill="none" />
    </g>
    <g className="zodiac-gesture" fill="none" strokeLinecap="round">
      <path d="M50 169q-18 2-19 18-1 10-13 11" stroke="#719e98" strokeWidth="5" />
      <path d="M49 171q-12 2-13 17-2 9-12 14" stroke="#b5d3c1" strokeWidth="2.8" />
      <path d="M26 169l-4 5m3 13-5 1" stroke="#8bb5ac" strokeWidth="3" />
    </g>
    <ellipse cx="79" cy="172" rx="9" ry="7" fill={CREAM} />
  </>;
}

function Fish({ color, fin }) {
  return <>
    <path fill={fin} d="M-18 0q-8-10-20-11l5 11-5 11q12-1 20-11Z" />
    <path fill={color} d="M-23 0q13-18 36-13Q24-9 28 0q-5 13-20 14Q-10 15-23 0Z" />
    <path fill={fin} d="M-8 1q-2 8-8 9l9 3 7-12Z" />
    <path d="M-9-6q7-4 14-4" fill="none" stroke={LIGHT} strokeWidth="2" strokeLinecap="round" opacity=".76" />
    <circle cx="17" cy="-2" r="3" fill={INK} />
    <circle cx="16.5" cy="-3" r="1" fill={LIGHT} />
    <ellipse cx="20" cy="4" rx="3.1" ry="1.5" fill={BLUSH} opacity=".8" />
  </>;
}

function Pisces() {
  return <>
    <g transform="translate(27 26) scale(.78)"><Person hair="#6d666b" outfit="#698781" trim="#bfcbc1" /></g>
    <g transform="translate(54 104) rotate(-43)"><g className="zodiac-gesture"><Fish color="#96aea2" fin="#6d958a" /></g></g>
    <g transform="translate(183 138) rotate(137)"><g className="zodiac-gesture zodiac-gesture--second"><Fish color="#a89ba9" fin="#81778a" /></g></g>
    <g fill="none" stroke="#86a79e" strokeWidth="2" opacity=".85">
      <circle cx="61" cy="67" r="4" /><circle cx="71" cy="55" r="2.6" />
      <circle cx="177" cy="177" r="4.5" /><circle cx="167" cy="188" r="2.5" />
    </g>
  </>;
}

const ART = { taurus: Taurus, gemini: Gemini, cancer: Cancer, leo: Leo, virgo: Virgo, libra: Libra,
  scorpio: Scorpio, sagittarius: Sagittarius, capricorn: Capricorn, aquarius: Aquarius, pisces: Pisces };

export function ZodiacMascot({ sign, label }) {
  const Art = Object.prototype.hasOwnProperty.call(ART, sign) ? ART[sign] : undefined;
  if (!Art && sign !== 'aries') return null;
  return <span className="zodiac-mascot" data-zodiac={sign}>
    {sign === 'aries' ? <AriesMascot size="100%" animated={false} label={label} /> : (
      <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" focusable="false"
        role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <ellipse cx="120" cy="216" rx="56" ry="5" fill="#4e4d45" opacity=".14" />
        <g className="zodiac-figure"><Art /></g>
      </svg>
    )}
  </span>;
}

export const ZodiacSignInRow = memo(function ZodiacSignInRow() {
  return <div className="auth-zodiac-row" aria-hidden="true">
    {ZODIAC.map(({ id }) => <ZodiacMascot key={id} sign={id} />)}
  </div>;
});
