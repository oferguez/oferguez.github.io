import React, { useEffect, useState } from 'react';

const analyticsLinks = [
  {
    id: 'gtm',
    label: 'Google Tag Manager',
    description: 'Manage containers, tags, and triggers',
    href: 'https://tagmanager.google.com/',
  },
  {
    id: 'ga4',
    label: 'Google Analytics',
    description: 'Review reporting for all properties',
    href: 'https://analytics.google.com/analytics/web/',
  },
  {
    id: 'assistant',
    label: 'Google Tag Assistant',
    description: 'Validate tag firing and event delivery',
    href: 'https://tagassistant.google.com/',
  },
];

const Analytics = () => {
  const [devCookieValue, setDevCookieValue] = useState(null);

  const getCookie = (name) => {
    return document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`))
      ?.split('=')[1];
  };

  useEffect(() => {
    const value = getCookie('dev_visit');
    setDevCookieValue(value ?? null);
  }, []);

  const isDevCookieTrue = devCookieValue === 'true';

  const enableAnalyticsDevMode = () => {
    const domain = location.hostname.endsWith('oferguez.net') ? '.oferguez.net' : undefined;
    document.cookie = `dev_visit=true; path=/; ${domain ? "domain=.oferguez.net;" : ""} max-age=31536000; SameSite=Lax`;
    setDevCookieValue('true');
  };

  const disableAnalyticsDevMode = () => {
    const domain = location.hostname.endsWith('oferguez.net') ? '.oferguez.net' : undefined;
    document.cookie = `dev_visit=; path=/; ${domain ? "domain=.oferguez.net;" : ""} max-age=0; SameSite=Lax`;
    setDevCookieValue('false');
  };

  return (
    <section className="analytics">
      <div className="analytics__header">
        <div className="analytics__copy">
          <p className="analytics__eyebrow">Dev Corner</p>
          <p className="analytics__description analytics__status">
            <span className="analytics__status-label">Dev cookie status:</span>{' '}
            <strong>{devCookieValue ?? 'N/A'}</strong>
          </p>
        </div>
        <div className="analytics__actions">
          <button
            type="button"
            className="analytics__button analytics__button--on"
            disabled={isDevCookieTrue}
            onClick={enableAnalyticsDevMode}
          >
            Turn on dev mode
          </button>
          <button
            type="button"
            className="analytics__button analytics__button--off"
            disabled={!isDevCookieTrue}
            onClick={disableAnalyticsDevMode}
          >
            Turn off dev mode
          </button>
        </div>
      </div>

      <div className="analytics__shortcuts">
        {analyticsLinks.map((link) => (
          <a
            key={link.id}
            href={link.href}
            className="analytics__shortcut"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="analytics__shortcut-label">{link.label}</span>
            <span className="analytics__shortcut-description">{link.description}</span>
          </a>
        ))}
      </div>
    </section>
  );
};

export default Analytics;
