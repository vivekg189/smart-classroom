-- Add file storage support to lectures table
-- Add new columns for file metadata
ALTER TABLE public.lectures 
ADD COLUMN file_type TEXT CHECK (file_type IN ('audio', 'pdf', 'ppt', 'pptx', 'doc', 'docx')),
ADD COLUMN file_name TEXT,
ADD COLUMN file_size BIGINT,
ADD COLUMN file_path TEXT,
ADD COLUMN duration INTEGER, -- for audio files in seconds
ADD COLUMN thumbnail_url TEXT; -- for PDF/PPT previews

-- Create a new table for lecture files (supports multiple files per lecture)
CREATE TABLE public.lecture_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('audio', 'pdf', 'ppt', 'pptx', 'doc', 'docx', 'video', 'image')),
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration INTEGER, -- for audio/video files in seconds
  thumbnail_url TEXT, -- for file previews
  is_primary BOOLEAN DEFAULT false, -- primary file for the lecture
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for lecture_files
ALTER TABLE public.lecture_files ENABLE ROW LEVEL SECURITY;

-- Create policies for lecture_files
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

-- Create trigger for lecture_files timestamp updates
CREATE TRIGGER update_lecture_files_updated_at
  BEFORE UPDATE ON public.lecture_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for lecture files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lecture-files', 'lecture-files', true);

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
