/*
  # Soft-delete old duplicate programs

  1. Changes
    - Marks 6 legacy programs (with UUID-based slugs) as deleted
    - These were created before the new 10-program seed and are now redundant
    - Titles: Parent Support Program, NICU Family Guidance, Education & Resources,
      Peer Support Network, Awareness & Advocacy, Bereavement Program

  2. Notes
    - Uses soft delete (deleted_at timestamp), data is preserved and recoverable
    - The 10 newer programs with proper slugs remain untouched
*/

UPDATE programs
SET deleted_at = now()
WHERE slug IN (
  '958c8b39-07a3-4147-ac11-19d53aa44693',
  '4c8f3555-b0f3-4f71-995e-6813de22282a',
  '89d27334-869b-4f8f-b703-133fa38e936a',
  '77ce29f5-a6da-4393-af93-d17857308a32',
  '6288fa65-86b0-4cd9-9aa6-58a6e7db3258',
  '8d455d97-deb5-4d1d-adca-b07244a36914'
)
AND deleted_at IS NULL;
