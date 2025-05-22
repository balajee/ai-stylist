import React from "react";

const AiStylistRadar: React.FC = () => {
  return (
    <div
      style={{
        position: "relative",
        height: "80vw",
        maxHeight: "400px",
        width: "80vw",
        maxWidth: "400px",
        backgroundColor: "#000000",
        fontFamily: "Inter, sans-serif",
        margin: "0 auto",
        overflow: "hidden",
      }}
      className="flex w-full"
    >
      {/* Centered Avatar */}
      <div className="absolute flex h-full w-full items-center justify-center">
        <img src="/ai.gif" className="w-1/2" alt="AI Avatar" />
      </div>

      {/* Animated Dots */}
      <div className="absolute flex h-full w-full items-center justify-center">
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * Math.PI * 2;
          const radius = 120 + (i % 2 === 0 ? 10 : -10);
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);

          const duration = 4 + Math.random() * 4;
          const delay = Math.random() * -duration;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `calc(50% + ${y}px)`,
                left: `calc(50% + ${x}px)`,
                width: "2px",
                height: "2px",
                borderRadius: "50%",
                backgroundColor: "#999",
                animation: `pulse ${duration}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* Pulse Keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.8);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AiStylistRadar;
