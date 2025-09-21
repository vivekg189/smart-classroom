-- Add transcription support to lecture_files table
ALTER TABLE public.lecture_files 
ADD COLUMN transcript TEXT,
ADD COLUMN transcript_status TEXT DEFAULT 'pending' CHECK (transcript_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add transcription support to lectures table
ALTER TABLE public.lectures 
ADD COLUMN has_transcript BOOLEAN DEFAULT false;

-- Create index for transcript status queries
CREATE INDEX idx_lecture_files_transcript_status ON public.lecture_files(transcript_status);

-- Create index for lectures with transcripts
CREATE INDEX idx_lectures_has_transcript ON public.lectures(has_transcript);

-- Update the trigger to handle transcript status updates
CREATE OR REPLACE FUNCTION update_lecture_transcript_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update lecture has_transcript status when file transcript status changes
  IF NEW.transcript_status = 'completed' AND OLD.transcript_status != 'completed' THEN
    UPDATE public.lectures 
    SET has_transcript = true 
    WHERE id = NEW.lecture_id;
  ELSIF NEW.transcript_status = 'failed' AND OLD.transcript_status != 'failed' THEN
    UPDATE public.lectures 
    SET has_transcript = false 
    WHERE id = NEW.lecture_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transcript status updates
CREATE TRIGGER update_lecture_transcript_status_trigger
  AFTER UPDATE ON public.lecture_files
  FOR EACH ROW
  EXECUTE FUNCTION update_lecture_transcript_status();
