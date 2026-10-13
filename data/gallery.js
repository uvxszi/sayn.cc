// Every gallery entry. To add one: put the image in assets/gallery/originals/ and add an entry here.
//
//   {
//     title: 'Shown as the heading and in the gallery list',
//     description: 'One or two sentences about the image.',
//     alt: 'What the image shows, for people who cannot see it.',
//     file: 'name-of-the-file.png',        (in assets/gallery/originals/)
//     tags: ['wallpaper', 'desktop'],      (each tag gets its own list page automatically)
//   },
//
// The entry's address is /gallery/<file name without the ending>/. Previews, the smaller
// download sizes, the gallery list and the tag pages are all made when the site is built.

module.exports = [
  {
    title: 'Sayn Icon — Green',
    description: 'Sayn Icon.',
    alt: 'Sayn icon on a dark background.',
    file: 'sayn-icon-color-1x1.png',
    tags: ['icon', 'minimalist'],
  },
  {
    title: 'Sayn Desktop Wallpaper — Green',
    description: 'Green Sayn symbol desktop wallpaper.',
    alt: 'Green Sayn symbol on a dark background.',
    file: 'sayn-icon-color-desktop.png',
    tags: ['desktop', 'wallpaper', 'minimalist'],
  },
  {
    title: 'Sayn Mobile Wallpaper — Green',
    description: 'Green Sayn symbol mobile wallpaper.',
    alt: 'Green Sayn symbol on a dark background.',
    file: 'sayn-icon-color.png',
    tags: ['mobile', 'wallpaper', 'minimalist'],
  },
  {
    title: 'Sayn Icon',
    description: 'Sayn Icon.',
    alt: 'Sayn icon on a dark background.',
    file: 'sayn-icon-sil-1x1.png',
    tags: ['icon', 'monochrome', 'minimalist'],
  },
  {
    title: 'Sayn Desktop Wallpaper',
    description: 'Sayn symbol desktop wallpaper black and white.',
    alt: 'Sayn symbol on a dark background.',
    file: 'sayn-icon-sil-desktop.png',
    tags: ['desktop', 'wallpaper', 'monochrome', 'minimalist'],
  },
  {
    title: 'Sayn Mobile Wallpaper',
    description: 'BW Sayn symbol mobile wallpaper.',
    alt: 'Black and white Sayn symbol on a dark background.',
    file: 'sayn-icon-sil.png',
    tags: ['mobile', 'wallpaper', 'monochrome', 'minimalist'],
  },
];
