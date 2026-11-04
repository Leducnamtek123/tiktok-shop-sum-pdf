#!/bin/sh
# Build lại assets/tailwind.css sau khi thêm/sửa class Tailwind trong index.html.
printf '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n' > /tmp/tw-in.css
npx --yes tailwindcss@3.4.17 -c tailwind.config.js -i /tmp/tw-in.css -o assets/tailwind.css --minify
