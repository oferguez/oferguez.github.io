import React, { useEffect, useState } from 'react';
import {logDevMessage, logDevError} from "../utils/SentryDevClient";

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
  {
    id: 'last_7d_report',
    label: 'Last 7 Days',
    description: 'Users activity for the last 7 days',
    href: 'https://docs.google.com/spreadsheets/d/1jMngSTEOUzRjag2v-3aCY03pe1_2Hy0hp4NEGAvUli0/edit?usp=sharing',
  }
];

function extractGACookies() {
  const cookies = Object.fromEntries(
    document.cookie.split('; ').map(c => c.split('=').map(decodeURIComponent))
  );

  const pseudo_id = (() => {
    const ga = cookies['_ga'];
    if (!ga) return null;
    const parts = ga.split('.');
    return parts.length === 4 ? `${parts[2]}.${parts[3]}` : null;
  })();

  const _ga_value  = (() => {
    const entry = Object.entries(cookies).find(([key]) =>
      key.startsWith('_ga_')
    );
    if (!entry) return null;
    return entry;
  })();

  const session_id = (() => {
    const entry = Object.entries(cookies).find(([key]) =>
      key.startsWith('_ga_')
    );
    if (!entry) return null;
    const value = entry[1];
    const parts = value.split('.');
    if (parts.length < 3)
      return null;

    const match = parts[2].match(/s(\d+)/);
    return match ? match[1] : null;
  })();

  const dev_visit = cookies['dev_visit'] || null;

  return {
    pseudo_id,
    session_id,
    _ga_value,
    dev_visit
  };
}



const Analytics = () => {
  const [devCookieValue, setDevCookieValue] = useState('false');

  const getCookie = (name) => {
    return document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`))
      ?.split('=')[1];
  };

  useEffect(() => {
    const value = getCookie('dev_visit');
    setDevCookieValue(value ?? 'false');
  }, []);

  const isDevCookieTrue = devCookieValue === 'true';

  const enableAnalyticsDevMode = () => {
    const domain = location.hostname.endsWith('oferguez.net') ? '.oferguez.net' : undefined;
    document.cookie = `dev_visit=true; path=/; ${domain ? "domain=.oferguez.net;" : ""} max-age=31536000; SameSite=Lax`;
    setDevCookieValue('true');
    logDebugState('enableAnalyticsDevMode')
  };

  const disableAnalyticsDevMode = () => {
    const domain = location.hostname.endsWith('oferguez.net') ? '.oferguez.net' : undefined;
    document.cookie = `dev_visit=false; path=/; ${domain ? "domain=.oferguez.net;" : ""} max-age=31536000; SameSite=Lax`;
    setDevCookieValue('false');
    logDebugState('disableAnalyticsDevMode')
  };

  const logDebugState = (caller) => {
    const message = `Called by ${caller}, GA4 IDs: ${JSON.stringify(extractGACookies())}`;
    console.log(message);
    logDevMessage(message);
  }

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
