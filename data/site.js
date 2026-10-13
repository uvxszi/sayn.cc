// Site-wide settings, and the links that are used in more than one place.

module.exports = {
  title: 'Sayn',
  tagline: 'Strange Encounters Sayn',
  url: 'https://sayn.cc',

  // Used for a page that has no description of its own.
  description: 'The official site for Sayn and Strange Encounters Sayn. Art, fiction, galleries, projects, archives and other material.',

  author: { name: 'uvxszi', url: 'https://uvxszi.com/' },

  // The links in the header, in order. Only list pages that exist.
  nav: [
    { title: 'Sayn', url: '/' },
    { title: 'What is Sayn?', url: '/about/' },
    { title: 'Strange Encounters Sayn', url: '/strange-encounters-sayn/' },
    { title: 'Gallery', url: '/gallery/' },
    { title: 'Links', url: '/links/' },
  ],

  // Sayn elsewhere on the internet. Shown in the footer and wherever a page has <!-- network -->.
  network: [
    { title: 'r/sayn', url: 'https://www.reddit.com/r/sayn/', description: 'The Sayn community on Reddit.' },
    { title: 'Discord', url: 'https://discord.gg/fNu5HeV9Xj', description: 'The Sayn community Discord.' },
  ],
};
