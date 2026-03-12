import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { RefreshCw } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const y = useMotionValue(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const opacity = useTransform(y, [0, 80], [0, 1]);
  const rotate = useTransform(y, [0, 80], [0, 360]);
  const scale = useTransform(y, [0, 80], [0.5, 1]);

  const handleTouchStart = (e) => {
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const delta = Math.max(0, currentY - startY.current);
    const resistance = 0.4;
    
    if (delta > 0) {
      y.set(Math.min(delta * resistance, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const currentY = y.get();
    
    if (currentY > 60 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    
    animate(y, 0, { type: "spring", stiffness: 500, damping: 30 });
  };

  useEffect(() => {
    if (isRefreshing) {
      y.set(60);
    }
  }, [isRefreshing]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ height: "100%", overflow: "auto", position: "relative" }}
    >
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          y: y,
          opacity,
          zIndex: 10,
        }}
      >
        <motion.div style={{ rotate, scale }}>
          <RefreshCw
            className={`w-6 h-6 text-slate-600 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </motion.div>
      </motion.div>
      
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}