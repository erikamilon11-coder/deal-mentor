import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

const pageVariants = {
  initial: (direction) => ({
    x: direction > 0 ? "100%" : "-20%",
    opacity: direction > 0 ? 1 : 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? "-20%" : "100%",
    opacity: direction > 0 ? 0 : 1,
    position: "absolute",
  }),
};

const pageTransition = {
  type: "tween",
  ease: [0.4, 0, 0.2, 1],
  duration: 0.35,
};

export default function PageTransition({ children, direction = 1 }) {
  const location = useLocation();

  return (
    <AnimatePresence initial={false} mode="popLayout" custom={direction}>
      <motion.div
        key={location.pathname}
        custom={direction}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        style={{ width: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}