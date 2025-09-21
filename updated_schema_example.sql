-- Updated lecture_files schema with transcription support
-- This is what your lecture_files table should look like after running the migration

CREATE TABLE public.lecture_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_path text NOT NULL,
  mime_type text NOT NULL,
  duration integer NULL,
  thumbnail_url text NULL,
  is_primary boolean NULL DEFAULT false,
  transcript text NULL,                    -- NEW: Stores the transcribed text
  transcript_status text DEFAULT 'pending' CHECK (transcript_status IN ('pending', 'processing', 'completed', 'failed')), -- NEW: Tracks transcription status
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lecture_files_pkey PRIMARY KEY (id),
  CONSTRAINT lecture_files_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES lectures (id) ON DELETE CASCADE,
  CONSTRAINT lecture_files_file_type_check CHECK (
    (
      file_type = ANY (
        ARRAY[
          'audio'::text,
          'pdf'::text,
          'ppt'::text,
          'pptx'::text,
          'doc'::text,
          'docx'::text,
          'video'::text,
          'image'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Updated lectures schema with transcription support
-- This is what your lectures table should look like after running the migration

CREATE TABLE public.lectures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  audio_url text NULL,
  transcript text NULL,
  short_summary text NULL,
  detailed_summary text NULL,
  flashcards jsonb NULL,
  concept_map jsonb NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  duration integer NULL,
  file_size integer NULL,
  has_transcript boolean DEFAULT false,    -- NEW: Indicates if lecture has transcript
  CONSTRAINT lectures_pkey PRIMARY KEY (id),
  CONSTRAINT lectures_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles (user_id) ON DELETE CASCADE,
  CONSTRAINT lectures_status_check CHECK (
    (
      status = ANY (ARRAY['draft'::text, 'published'::text])
    )
  )
) TABLESPACE pg_default;

-- Example of how the transcription data will look in your database:

-- lecture_files table with transcription data:
-- id: 123e4567-e89b-12d3-a456-426614174000
-- lecture_id: 456e7890-e89b-12d3-a456-426614174001
-- file_name: "lecture_recording.webm"
-- file_type: "audio"
-- file_size: 2048576
-- file_path: "lectures/456e7890-e89b-12d3-a456-426614174001/1640995200000_lecture_recording.webm"
-- mime_type: "audio/webm"
-- duration: 300
-- thumbnail_url: null
-- is_primary: true
-- transcript: "Welcome to today's lecture. Today we will be discussing the fundamentals of machine learning. Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data."
-- transcript_status: "completed"
-- created_at: 2024-01-01 12:00:00+00
-- updated_at: 2024-01-01 12:05:00+00

-- lectures table with transcription indicator:
-- id: 456e7890-e89b-12d3-a456-426614174001
-- teacher_id: 789e0123-e89b-12d3-a456-426614174002
-- title: "Introduction to Machine Learning"
-- description: "Basic concepts and applications"
-- status: "published"
-- has_transcript: true  -- NEW: This will be automatically set to true when transcript is completed
-- ... other fields
