import React from 'https://esm.sh/react@18.2.0';

const e = React.createElement;

const eventDetails = [
  { label: 'Date', value: 'Tuesday, 2 June 2026' },
  { label: 'Time', value: '19:00' },
  { label: 'Location', value: 'TBC' },  
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
  return e(
    'div',
    { className: 'gp-detail-card' },
    e('span', { className: 'gp-detail-label' }, label),
    e('strong', { className: 'gp-detail-value' }, value),
  );
}

export function GreenPaprikaJVSEvent() {
  return e(
    'main',
    { className: 'gp-shell' },
    e(
      'section',
      { className: 'gp-layout' },
      e(
        'aside',
        { className: 'gp-left-column' },
        e(
          'div',
          { className: 'gp-flyer-panel' },
          e('img', {
            className: 'gp-flyer',
            src: '/green-paprika/jvs_event_files/JVS_Event_Flyer.png',
            alt: 'Green Paprika supper flyer with Hungarian dishes.',
          }),
        ),
        e(
          'div',
          { className: 'gp-panel gp-contact-panel' },
          e('p', { className: 'gp-section-label' }, 'Contact'),
          e('h2', null, 'For questions or special requests'),
          e(
            'form',
            {
              className: 'gp-form',
              action: 'https://formspree.io/f/mykdnwpp',
              method: 'POST',
            },
            e('label', { htmlFor: 'greenPaprikaName' }, 'Name'),
            e('input', {
              id: 'greenPaprikaName',
              name: 'name',
              type: 'text',
              required: true,
            }),
            e('label', { htmlFor: 'greenPaprikaReplyEmail' }, 'Email'),
            e('input', {
              id: 'greenPaprikaReplyEmail',
              name: 'email',
              type: 'email',
              required: true,
            }),
            e('label', { htmlFor: 'greenPaprikaMessage' }, 'Message'),
            e('textarea', {
              id: 'greenPaprikaMessage',
              name: 'message',
              rows: '5',
              required: true,
            }),
            e('input', {
              type: 'hidden',
              name: '_subject',
              value: 'Green Paprika enquiry',
            }),
            e('input', {
              type: 'text',
              name: '_gotcha',
              style: { display: 'none' },
            }),
            e(
              'div',
              { className: 'gp-form-actions' },
              e(
                'button',
                { className: 'gp-submit', type: 'submit' },
                'Send Enquiry',
              ),
            ),
          ),
        ),
      ),
      e(
        'section',
        { className: 'gp-panel gp-content-panel gp-center' },
        e('h2', null, 'Green Paprika Hungarian Supper'),
        e(
          'p',
          { className: 'gp-lede' },
          'A special mid-week dinner of plant-based Hungarian dishes, inspired by the family recipes I grew up with.',
        ),
        e(
          'div',
          { className: 'gp-details' },
          eventDetails.map((item) =>
            e(DetailCard, {
              key: item.label,
              label: item.label,
              value: item.value,
            }),
          ),
        ),
        e(
          'p',
          { className: 'gp-note' },
          [
            'Spaces are limited to 10 so early booking is recommended. The exact Golders Green location is confirmed when booking. Book here: ',
            e(
              'a',
              {
                className: 'gp-inline-link',
                href: 'https://tickets.jvs.org.uk/events/green-paprika-hungarian-supper',
              },
              'tickets.jvs.org.uk/events/green-paprika-hungarian-supper',
            ),
          ],
        ),
        e(
          'section',
          { className: 'gp-content-block' },
          e('p', { className: 'gp-section-label gp-center' }, 'Menu'),
          e(
            'ul',
            { className: 'gp-menu-list' },
            menuItems.map((item) =>
              e(
                'li',
                { key: item.title },
                e('strong', null, item.title),
                e('span', null, item.description),
              ),
            ),
          ),
        ),
        e(
          'section',
          { className: 'gp-content-block' },
          e('p', { className: 'gp-section-label gp-center' }, 'About'),
          e('h2', null, 'Green Paprika'),
          e(
            'p',
            { className: 'gp-body-copy' },
            'Green Paprika is a vegan pop-up and takeaway kitchen in London, bringing traditional Hungarian dishes to life as generous, comforting plant-based food.',
          ),
          e(
            'p',
            { className: 'gp-body-copy' },
            'Gluten free options are available, but please let us know at least a week in advance.',
          ),
        ),
        e(
          'div',
          { className: 'gp-actions' },
          e(
            'a',
            {
              className: 'gp-button gp-button-secondary',
              href: '/green-paprika/chapel-market-kitchen-popup.html',
            },
            'Previous Event',
          ),
        ),
      ),
    ),
  );
}
