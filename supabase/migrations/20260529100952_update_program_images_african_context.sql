/*
  # Update program images to African context

  1. Changes
    - Updates all 10 program image_url values
    - Replaces generic stock photos with Africa-specific medical/family imagery
    - All images sourced from Pexels (free to use, no attribution required)

  2. Programs Updated
    - Parent Emotional Support: African mother cradling newborn
    - NICU Family Support: Doctor attending newborns in incubator (Uganda)
    - Kangaroo Mother Care: African mother holding baby close
    - Breastfeeding & Nutrition: Mother breastfeeding baby in African attire
    - Father & Family Inclusion: African family with newborn
    - Parent Support Communities: African women in community gathering
    - Financial & Practical Assistance: African community sharing resources
    - Education & Awareness: Nurse caring for child in African hospital
    - Bereavement & Loss Support: Compassionate care scene
    - Professional & Hospital Partnerships: African nurse with newborn in hospital
*/

UPDATE programs SET image_url = 'https://images.pexels.com/photos/35260459/pexels-photo-35260459.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'parent-emotional-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/34185199/pexels-photo-34185199.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'nicu-family-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/33810971/pexels-photo-33810971.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'kangaroo-mother-care' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/33810970/pexels-photo-33810970.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'breastfeeding-nutrition-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/33810963/pexels-photo-33810963.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'father-family-inclusion' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/33512002/pexels-photo-33512002.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'parent-support-communities' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/33763200/pexels-photo-33763200.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'financial-practical-assistance' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/34185202/pexels-photo-34185202.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'education-awareness' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/6392851/pexels-photo-6392851.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'bereavement-loss-support' AND deleted_at IS NULL;

UPDATE programs SET image_url = 'https://images.pexels.com/photos/34185205/pexels-photo-34185205.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
WHERE slug = 'professional-hospital-partnerships' AND deleted_at IS NULL;
