import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { mccPlugin } from '@manual-code-coverage/vite-plugin';

export default defineConfig({
  plugins: [react(), mccPlugin()],
});
