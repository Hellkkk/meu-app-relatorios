import { useEffect, useState } from 'react';

/**
 * Custom hook to observe element resize and return its dimensions
 * @param {React.RefObject} ref - Reference to the element to observe
 * @returns {Object} Object containing width and height of the element
 */
const useResizeObserver = (ref) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const observeTarget = ref.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(observeTarget);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return dimensions;
};

export default useResizeObserver;
