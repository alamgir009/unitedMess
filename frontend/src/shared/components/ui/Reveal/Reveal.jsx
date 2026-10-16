import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

const Reveal = memo(({ children, delay = 0 }) => {
    const shouldReduceMotion = useReducedMotion();
    return (
        <motion.div
            initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
});
Reveal.displayName = 'Reveal';

export default Reveal;
