import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Regenerate icons: pnpm --filter @tms/web icons
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
})
