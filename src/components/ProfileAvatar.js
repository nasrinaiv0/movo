import React, { useState } from 'react';

export default function ProfileAvatar({ user, size = '', children }) {
  const [failedPhoto, setFailedPhoto] = useState('');
  const photo = user.photo;
  return <span className={`avatar${size ? ` ${size}` : ''}`} aria-hidden="true">
    {photo && photo !== failedPhoto ? <img className="avatar-photo" src={photo} alt="" onError={() => setFailedPhoto(photo)} /> : user.initial}
    {children}
  </span>;
}
