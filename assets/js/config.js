/*
  Finora by DesignLab — Supabase Edition
  Configured with your Supabase project URL and publishable key.
  Keep the service role key out of this file. Only the public anon/publishable key belongs here.
*/
window.FINORA_CONFIG = {
  APP_NAME: "Finora",
  APP_OWNER: "DesignLab",
  APP_TAGLINE: "Money planning by DesignLab",
  VERSION: "2.1.5",
  EDITION: "Supabase Edition",

  SUPABASE_URL: "https://ulclhxperkzuchaoqwps.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_1Y4WqxwZh7qAxGwH7gL8lg_Wpus7h-k",

  STORAGE_PREFIX: "finora_supabase_v2",
  DEFAULT_USERNAME: "jaravata",
  DEFAULT_CURRENCY: "PHP",
  DEFAULT_LOCALE: "en-PH",
  PERSONAL_MODE: true,

  FEATURES: {
    REGISTRATION_ENABLED: false,
    OWNER_RECOVERY_ENABLED: true,
    JSON_BACKUP: true,
    CSV_EXPORT: true,
    PWA: true
  }
};
