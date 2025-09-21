-- Run this SQL in your Supabase SQL Editor to create the lecture_files table

-- Create lecture_files table
CREATE TABLE IF NOT EXISTS public.lecture_files (
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

-- Add transcription support to lecture_files table
ALTER TABLE public.lecture_files 
ADD COLUMN IF NOT EXISTS transcript TEXT,
ADD COLUMN IF NOT EXISTS transcript_status TEXT DEFAULT 'pending' CHECK (transcript_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add transcription support to lectures table
ALTER TABLE public.lectures 
ADD COLUMN IF NOT EXISTS has_transcript BOOLEAN DEFAULT false;

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

-- Create storage bucket for lecture files (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lecture-files', 'lecture-files', true)
ON CONFLICT (id) DO NOTHING;

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
