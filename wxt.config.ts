import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Flow Prompt Sender',
    description: 'Envía prompts al cuadro de Google Flow (flow.google.com) desde el popup.',
    permissions: ['activeTab', 'scripting'],
    host_permissions: ['*://flow.google.com/*'],
  },
});
