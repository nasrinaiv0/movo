import React, { useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import { LANGUAGES, t as tr } from '../lib/i18n';
import './LanguageSheet.css';

const normalize = (value) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
const searchIndex = LANGUAGES.map(language => ({
  language,
  searchable: normalize(`${language.name} ${language.englishName} ${language.code}`),
}));

export default function LanguageSheet({ value, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const options = searchIndex.filter(({ searchable }) => words.every(word => searchable.includes(word)));
  const automatic = tr('Automatic (device language)');
  const showAutomatic = !words.length || words.every(word => normalize(automatic).includes(word));

  return <Sheet title={tr('Language')} subtitle={tr('Choose the language for MOVO on this device.')}
    label={tr('Language')} onClose={onClose} className="language-sheet">
    <label className="search-field language-search">
      <Icon name="search" size={18} />
      <input type="search" value={query} onChange={event => setQuery(event.target.value)}
        aria-label={tr('Search languages')} placeholder={tr('Search languages')} autoComplete="off" spellCheck={false} />
    </label>
    <p className="form-note language-note">{tr('Languages marked Limited translation show some labels in your chosen language. Other text appears in English.')}</p>
    <div className="sheet-list">
      {showAutomatic && <button type="button" className={`sheet-card${!value ? ' selected' : ''}`}
        aria-pressed={!value} onClick={() => onPick('')}>
        <span className="account-main"><strong>{automatic}</strong></span>
        {!value && <Icon name="check" size={18} />}
      </button>}
      {options.map(({ language }) => <button type="button" key={language.code}
        className={`sheet-card${value === language.code ? ' selected' : ''}`}
        aria-pressed={value === language.code} onClick={() => onPick(language.code)}>
        <span className="account-main">
          <strong><bdi lang={language.code} dir={language.dir}>{language.name}</bdi></strong>
          {(language.englishName !== language.name || language.preview) && <small>
            {language.englishName !== language.name && <bdi lang="en">{language.englishName}</bdi>}
            {language.preview && <span>{tr('Limited translation')}</span>}
          </small>}
        </span>
        {value === language.code && <Icon name="check" size={18} />}
      </button>)}
    </div>
    {!showAutomatic && !options.length && <p className="empty" role="status">{tr('No languages match your search.')}</p>}
  </Sheet>;
}
