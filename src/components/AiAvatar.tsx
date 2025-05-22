import React from "react";

interface AiAvatarProps {
  className?: string;
  alt?: string;
  src?: string;
}

const AiAvatar: React.FC<AiAvatarProps> = ({
  className = "w-38",
  alt = "AI Stylist",
  src = "/ai.gif",
}) => {
  return <img src={src} alt={alt} className={className} />;
};

export default AiAvatar;
