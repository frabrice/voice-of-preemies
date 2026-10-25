/*
  # Private file storage for the dashboard Documents page

  ## Why
  Document files (contracts, internal records) used to be uploaded to
  Cloudinary and saved as public links. Cloudinary accepts PDFs but refuses to
  serve them back on this account ("deny or ACL failure"), so uploaded PDFs
  could not be opened. They were also reachable by anyone holding the link.

  ## What
  - Private storage bucket `documents` (50 MB per file). Files are opened only
    through short-lived signed links created by a logged-in dashboard user.
  - `documents.storage_path` / `documents.file_name` record the stored file.
    `documents.file_url` stays for documents that are an external link.

  ## Security
  Only `authenticated` users can read, upload, replace or remove objects in the
  `documents` bucket. There is no anonymous access at all.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

CREATE POLICY "authenticated_select_documents_bucket" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "authenticated_insert_documents_bucket" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "authenticated_update_documents_bucket" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
CREATE POLICY "authenticated_delete_documents_bucket" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documents');

ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name text;
