const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');
postcss([tailwindcss()]).process(`
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
.dark\\:text-red-500 { color: red; }
`, {from: undefined}).then(result => console.log(result.css));
