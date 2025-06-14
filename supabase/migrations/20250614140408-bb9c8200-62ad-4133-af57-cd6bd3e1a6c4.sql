
-- Create match_notifications table
CREATE TABLE public.match_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  match_id TEXT NOT NULL,
  match_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.match_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for match_notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.match_notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notifications" 
  ON public.match_notifications 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON public.match_notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
  ON public.match_notifications 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at column
CREATE TRIGGER update_match_notifications_updated_at 
  BEFORE UPDATE ON public.match_notifications 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_match_notifications_user_match ON public.match_notifications(user_id, match_id);
CREATE INDEX idx_match_notifications_pending ON public.match_notifications(match_start_time, notification_sent) WHERE notification_sent = false;

-- Enable realtime for match_notifications
ALTER TABLE public.match_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_notifications;
