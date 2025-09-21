-- Add transcription support to existing lecture_files table
-- This script adds the missing transcription columns to your current schema

-- Add transcription columns to lecture_files table
ALTER TABLE public.lecture_files 
ADD COLUMN IF NOT EXISTS transcript TEXT,
ADD COLUMN IF NOT EXISTS transcript_status TEXT DEFAULT 'pending' CHECK (transcript_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add transcription support to lectures table
ALTER TABLE public.lectures 
ADD COLUMN IF NOT EXISTS has_transcript BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lecture_files_transcript_status ON public.lecture_files(transcript_status);
CREATE INDEX IF NOT EXISTS idx_lectures_has_transcript ON public.lectures(has_transcript);

-- Create function to update lecture transcript status
CREATE OR REPLACE FUNCTION update_lecture_transcript_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update lecture has_transcript status when file transcript status changes
  IF NEW.transcript_status = 'completed' AND (OLD.transcript_status IS NULL OR OLD.transcript_status != 'completed') THEN
    UPDATE public.lectures 
    SET has_transcript = true 
    WHERE id = NEW.lecture_id;
  ELSIF NEW.transcript_status = 'failed' AND (OLD.transcript_status IS NULL OR OLD.transcript_status != 'failed') THEN
    UPDATE public.lectures 
    SET has_transcript = false 
    WHERE id = NEW.lecture_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transcript status updates
DROP TRIGGER IF EXISTS update_lecture_transcript_status_trigger ON public.lecture_files;
CREATE TRIGGER update_lecture_transcript_status_trigger
  AFTER UPDATE ON public.lecture_files
  FOR EACH ROW
  EXECUTE FUNCTION update_lecture_transcript_status();

-- Enable RLS for lecture_files if not already enabled
ALTER TABLE public.lecture_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Teachers can view files for their lectures" ON public.lecture_files;
DROP POLICY IF EXISTS "Students can view files for published lectures" ON public.lecture_files;
DROP POLICY IF EXISTS "Teachers can insert files for their lectures" ON public.lecture_files;
DROP POLICY IF EXISTS "Teachers can update files for their lectures" ON public.lecture_files;
DROP POLICY IF EXISTS "Teachers can delete files for their lectures" ON public.lecture_files;

-- Create new policies for lecture_files
CREATE POLICY "Teachers can view files for their lectures" 
ON public.lecture_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lectures 
    WHERE lectures.id = lecture_files.lecture_id 
    AND lectures.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view files for published lectures" 
ON public.lecture_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lectures 
    WHERE lectures.id = lecture_files.lecture_id 
    AND lectures.status = 'published'
  )
);

CREATE POLICY "Teachers can insert files for their lectures" 
ON public.lecture_files 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lectures 
    WHERE lectures.id = lecture_files.lecture_id 
    AND lectures.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update files for their lectures" 
ON public.lecture_files 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.lectures 
    WHERE lectures.id = lecture_files.lecture_id 
    AND lectures.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete files for their lectures" 
ON public.lecture_files 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.lectures 
    WHERE lectures.id = lecture_files.lecture_id 
    AND lectures.teacher_id = auth.uid()
  )
);

-- Create storage bucket for lecture files if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lecture-files', 'lecture-files', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Teachers can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update their files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete their files" ON storage.objects;
DROP POLICY IF EXISTS "Students can view published lecture files" ON storage.objects;

-- Create storage policies for lecture files
CREATE POLICY "Teachers can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'lecture-files' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.lectures 
    WHERE lectures.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update their files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'lecture-files' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.lectures 
    WHERE lectures.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete their files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'lecture-files' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.lectures 
    WHERE lectures.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view published lecture files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'lecture-files' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.lecture_files lf
    JOIN public.lectures l ON l.id = lf.lecture_id
    WHERE l.status = 'published'
    AND lf.file_path = objects.name
  )
);

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'lecture_files' 
AND table_schema = 'public'
ORDER BY ordinal_position;
