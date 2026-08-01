/*
  # Update program images with real Cloudinary photos

  1. Changes
    - Replaces all 10 program image URLs with real Voice of Preemies photos hosted on Cloudinary
    - Images include actual team photos, NICU moments, community events, and support sessions

  2. Programs Updated
    - Parent Emotional Support: Supportive conversation scene
    - NICU Family Support: Tender moment in the NICU
    - Kangaroo Mother Care: Holding hands in neonatal care
    - Breastfeeding & Nutrition: Serene moments in a cozy nursery
    - Father & Family Inclusion: Community health presentation in marquee tent
    - Parent Support Communities: Celebration under the festive tent
    - Financial & Practical Assistance: Akagofero community photo
    - Education & Awareness: Educational/awareness illustration
    - Bereavement & Loss Support: Supportive conversation in a cozy space
    - Professional & Hospital Partnerships: NICU team celebration in purple tones
*/

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951322/Supportive_conversation_in_a_cozy_space_mh9heg.png'
WHERE slug = 'parent-emotional-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/Tender_moment_in_the_NICU_vkmzge.png'
WHERE slug = 'nicu-family-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/Holding_hands_in_neonatal_care_dnak8z.png'
WHERE slug = 'kangaroo-mother-care' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951322/Serene_moments_in_a_cozy_nursery_t13cjj.png'
WHERE slug = 'breastfeeding-nutrition-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1780126642/Community_health_presentation_in_marquee_tent_dbwivt.png'
WHERE slug = 'father-family-inclusion' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1780126643/Celebration_under_the_festive_tent_j7fy2h.png'
WHERE slug = 'parent-support-communities' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951323/akagofero_r83ks8.png'
WHERE slug = 'financial-practical-assistance' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1780126643/ChatGPT_Image_May_30_2026_09_35_16_AM_gyllzm.png'
WHERE slug = 'education-awareness' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1779951322/Supportive_conversation_in_a_cozy_space_mh9heg.png'
WHERE slug = 'bereavement-loss-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://res.cloudinary.com/dbhyrnypc/image/upload/v1780126644/NICU_team_celebration_in_purple_tones_nmvlnv.png'
WHERE slug = 'professional-hospital-partnerships' AND deleted_at IS NULL;
