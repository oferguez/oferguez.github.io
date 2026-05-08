import React from 'react';
import '../styles/GreenPaprika.css';

const eventDetails = [
  { label: 'Date', value: 'Tuesday, 2 June 2026' },
  { label: 'Time', value: '19:00' },
  { label: 'Location', value: 'TBC, London' },
];

const menuItems = [
  {
    title: 'Chilled cherry soup',
    description:
      'A cool, bright opening course with the sweet-sour character associated with Hungarian summer cooking.',
  },
  {
    title: 'Goulash of mushrooms, root vegetables and seitan',
    description:
      'Served with nokedli, Hungarian dumplings, and cashew sour cream.',
  },
  {
    title: 'Chocolate and chestnut mousse',
    description: 'Finished with vanilla whipped cream.',
  },
];

function DetailCard({ label, value }) {
  return (
    <div className="gp-detail-card">
      <span className="gp-detail-label">{label}</span>
      <strong className="gp-detail-value">{value}</strong>
    </div>
  );
}

export default function GreenPaprikaJVSEvent() {
  return (
    <main className="gp-page">
      <div className="gp-shell">
        <section className="gp-layout">
          <aside className="gp-left-column">
            <div className="gp-flyer-panel">
              <img
                className="gp-flyer"
                src="/green-paprika/jvs_event_files/JVS_Event_Flyer.png"
                alt="Green Paprika supper flyer with Hungarian dishes."
              />
            </div>

            <div className="gp-panel gp-contact-panel">
              <p className="gp-section-label">Contact</p>
              <h2>For questions or special requests</h2>
              <form className="gp-form" action="https://formspree.io/f/mykdnwpp" method="POST">
                <label htmlFor="greenPaprikaName">Name</label>
                <input id="greenPaprikaName" name="name" type="text" required />

                <label htmlFor="greenPaprikaReplyEmail">Email</label>
                <input id="greenPaprikaReplyEmail" name="email" type="email" required />

                <label htmlFor="greenPaprikaMessage">Message</label>
                <textarea id="greenPaprikaMessage" name="message" rows="5" required />

                <input type="hidden" name="_subject" value="Green Paprika enquiry" />
                <input type="text" name="_gotcha" style={{ display: 'none' }} />

                <div className="gp-form-actions">
                  <button className="gp-submit" type="submit">
                    Send Enquiry
                  </button>
                </div>
              </form>
            </div>
          </aside>

          <section className="gp-panel gp-content-panel">
            <h1>Green Paprika Hungarian Supper</h1>
            <p className="gp-note">
              Join for a special mid-week dinner of plant-based Hungarian dishes,
              inspired by my family recipes I grew up with.
            </p>

            <div className="gp-details">
              {eventDetails.map((item) => (
                <DetailCard key={item.label} label={item.label} value={item.value} />
              ))}
            </div>

            <p className="gp-note">
              Spaces are limited to 10 so early booking is recommended. The exact Golders
              Green location is confirmed when booking. Book here
              {' '}
              <a
                className="gp-inline-button"
                href="https://tickets.jvs.org.uk/events/green-paprika-hungarian-supper"
              >
                Reserve
              </a>
            </p>

            <section className="gp-content-block">
              <p className="gp-section-label gp-center">Menu</p>
              <p className="gp-body-copy gp-menu-note">
                Gluten free options are available, please let us know at least a week in advance.
              </p>
              <ul className="gp-menu-list">
                {menuItems.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="gp-content-block">
              <p className="gp-section-label gp-center">About</p>
              <p className="gp-body-copy">
                Green Paprika is a London vegan Hungarian pop-up and takeaway kitchen,
                serving traditional Hungarian dishes as generous, comforting plant-based food.
              </p>
              <p className="gp-body-copy">
                Through supper events, pop-up dinners, popup collaborations, and takeaway
                food, Green Paprika serves plant-based Hungarian cooking across London.
              </p>
            </section>

            <div className="gp-actions">
              <a
                className="gp-button gp-button-secondary gp-button-previous"
                href="/green-paprika/chapel-market-kitchen-popup.html"
              >
                Previous Event
              </a>
              <a
                className="gp-social-icon-button"
                href="https://www.instagram.com/green_paprika_london/"
                aria-label="Instagram"
                title="Instagram"
              >
                <svg
                  className="gp-instagram-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5.25" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.5" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
