import type { VideoContent } from "@/types";

interface VideoSlideProps {
  video: VideoContent;
}

export function VideoSlide({ video }: VideoSlideProps) {
  if (!video.video_url) return null;

  return (
    <div className="video-slide-wrapper">
      <video
        src={video.video_url}
        muted
        loop
        playsInline
        className="video-slide-player"
      />
    </div>
  );
}
