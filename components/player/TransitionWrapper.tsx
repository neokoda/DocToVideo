'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface TransitionWrapperProps {
  sceneKey: string | number;
  children: React.ReactNode;
  onAnimationComplete?: () => void;
}

export function TransitionWrapper({ sceneKey, children, onAnimationComplete }: TransitionWrapperProps) {
  return (
    <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
      <motion.div
        key={sceneKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
