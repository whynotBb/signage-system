/* eslint-disable @next/next/no-img-element */
import type { ImageContent } from "@/types";

interface ImageSlideProps {
  image: ImageContent;
}

export function ImageSlide({ image }: ImageSlideProps) {
  if (!image.image_url) return null;

  return (
    <div className="image-slide-wrapper">
      <img
        src={image.image_url}
        alt={image.title}
        className="image-slide-img"
      />
    </div>
  );
}
