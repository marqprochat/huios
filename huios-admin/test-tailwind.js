const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');

postcss([tailwindcss()])
  .process(`
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));
@theme {
  --color-background-light: #f8f6f6;
  --color-background-dark: #0f172a;
}
.bg-background-light { @apply bg-background-light; }
`, { from: 'src/app/globals.css', to: 'dist/out.css' })
  .then(result => console.log(result.css))
  .catch(err => console.error(err));
