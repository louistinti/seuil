import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'remplacer',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  // Nom du Studio en ligne : https://<studioHost>.sanity.studio
  studioHost: process.env.SANITY_STUDIO_HOSTNAME,
  deployment: {autoUpdates: true},
})
