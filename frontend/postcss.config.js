// frontend/postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // If you installed @tailwindcss/postcss explicitly,
    // you might not even need it listed here if using a recent
    // version of tailwindcss itself, but including it doesn't hurt.
    // '@tailwindcss/postcss': {}, // Usually implicitly handled by 'tailwindcss' above now
  },
}