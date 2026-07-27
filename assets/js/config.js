/*
  Finora by DesignLab — Supabase Edition
  Configured with your Supabase project URL and publishable key.
  Keep the service role key out of this file. Only the public anon/publishable key belongs here.
*/
window.FINORA_CONFIG = {
  APP_NAME: "Finora",
  APP_OWNER: "DesignLab",
  APP_TAGLINE: "Money planning by DesignLab",
  VERSION: "2.0.7",
  EDITION: "Supabase Edition",

  SUPABASE_URL: "https://yqlvdciruweoozisjone.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_0tB9Gj5P2bIhy3-csBbccg_mFswsot1",

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
