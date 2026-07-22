import { useState, useEffect } from 'react';
import FaerieLanding from './FaerieLanding';
import Photobooth from './Photobooth';

export default function FaerieApp() {
  const [currentRoute, setCurrentRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentRoute === '#/photobooth') {
    return <Photobooth />;
  }

  return <FaerieLanding />;
}
