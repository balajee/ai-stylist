import { useEffect, useState } from "react";
import classNames from "classnames";

interface TypewriterTextProps {
  text: string | string[];
  speed?: number;
  pause?: number;
  classNm?: string;
  onDone?: () => void;
  loop?: boolean;
}

const TypewriterText = ({
  text,
  speed = 0,
  pause = 1500,
  classNm,
  onDone,
  loop = false,
}: TypewriterTextProps) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasFinishedOnce, setHasFinishedOnce] = useState(false);

  const textArray = Array.isArray(text) ? text : [text];

  useEffect(() => {
    const fullText = textArray[currentTextIndex];

    const updateText = () => {
      setDisplayedText((prev) =>
        isDeleting
          ? fullText.slice(0, prev.length - 1)
          : fullText.slice(0, prev.length + 1),
      );
    };

    const delay = isDeleting ? speed / 2 : speed;
    const timeout = setTimeout(updateText, delay);

    if (!isDeleting && displayedText === fullText) {
      if (loop) {
        setTimeout(() => setIsDeleting(true), pause);
      } else if (!hasFinishedOnce) {
        setHasFinishedOnce(true);
        onDone?.();
      }
    }

    if (isDeleting && displayedText === "") {
      setIsDeleting(false);
      const next = (currentTextIndex + 1) % textArray.length;
      setCurrentTextIndex(next);

      if (next === 0 && loop && onDone) {
        onDone(); // only after full loop
      }
    }

    return () => clearTimeout(timeout);
  }, [
    displayedText,
    isDeleting,
    textArray,
    currentTextIndex,
    speed,
    pause,
    loop,
    onDone,
    hasFinishedOnce,
  ]);

  const classes = classNames(
    "text-3xl font-semibold text-transparent bg-clip-text",
    classNm,
  );

  return (
    <p
      className={classes}
      style={{
        backgroundImage: "linear-gradient(45deg, #a78bfa, #3b82f6, #2563eb)",
      }}
    >
      {displayedText}
    </p>
  );
};

export default TypewriterText;
