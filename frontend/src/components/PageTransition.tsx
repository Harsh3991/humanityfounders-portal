import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export default function PageTransition({ children, className = "" }: { children: ReactNode, className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full ${className}`}
        >
            {children}
        </motion.div>
    );
}
