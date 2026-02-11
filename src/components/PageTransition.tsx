import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [transitionClass, setTransitionClass] = useState('page-transition fade-in');
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Start exit animation
    setTransitionClass('page-transition fade-out');

    const timer = setTimeout(() => {
      // Swap children and start entrance animation
      setDisplayedChildren(children);
      setTransitionClass('page-transition fade-in');
    }, 200); // Short exit to keep things feeling fast

    return () => clearTimeout(timer);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep children in sync for non-path changes (e.g. search params)
  useEffect(() => {
    setDisplayedChildren(children);
  }, [children]);

  return (
    <div className={transitionClass} key={location.pathname}>
      {displayedChildren}
    </div>
  );
}
