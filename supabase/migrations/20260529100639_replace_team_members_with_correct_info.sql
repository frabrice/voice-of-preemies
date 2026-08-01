/*
  # Replace team members with correct information

  1. Changes
    - Soft-deletes all existing team members
    - Inserts 4 new team members with correct names and roles:
      - Dr Jocelyne Bukeyeneza (Founder/CEO, Neonatologist)
      - Dr Uwurukundo (Head of Programs, Pediatrician, 20+ years)
      - Secyiza Fridoline (Community Manager, Businesswoman, preemie mother)
      - Pediatricians Team at KFH (Medical Advisors)
    - No image URLs set (placeholder design will be used)

  2. Notes
    - Old entries preserved via soft delete
    - New entries have sequential sort_order for proper display
*/

-- Soft-delete all existing team members
UPDATE team_members
SET deleted_at = now(), active = false
WHERE deleted_at IS NULL;

-- Insert 4 new team members
INSERT INTO team_members (name, role, bio, image_url, email, sort_order, active)
VALUES
  (
    'Dr Jocelyne Bukeyeneza',
    'Founder & CEO',
    'Neonatologist and passionate advocate for premature babies and their families in Rwanda. Founded Voice of Preemies to bridge the gap between hospital care and family support.',
    '',
    '',
    1,
    true
  ),
  (
    'Dr Uwurukundo',
    'Head of Programs',
    'Pediatrician with over 20 years of experience in neonatal care across Rwanda, dedicated to improving outcomes for premature and critically ill newborns.',
    '',
    '',
    2,
    true
  ),
  (
    'Secyiza Fridoline',
    'Community Manager',
    'Businesswoman and mother of a premature infant. Bridges families with the support, resources, and community they need during and after the NICU journey.',
    '',
    '',
    3,
    true
  ),
  (
    'Pediatricians Team at KFH',
    'Medical Advisors',
    'A dedicated team of pediatricians at King Faisal Hospital providing clinical guidance, medical expertise, and evidence-based direction for our education and care programs.',
    '',
    '',
    4,
    true
  );
