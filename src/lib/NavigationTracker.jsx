import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
    const location = useLocation();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    // Track user navigation (local only, no backend logging)
    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];

            // Try case-insensitive lookup in Pages config
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );

            pageName = matchedKey || null;
        }

        // Log to localStorage for debugging
        if (pageName) {
            const logs = JSON.parse(localStorage.getItem('emat_navigation_logs') || '[]');
            logs.push({
                page: pageName,
                timestamp: new Date().toISOString(),
                path: location.pathname
            });
            // Keep only last 100 logs
            if (logs.length > 100) logs.shift();
            localStorage.setItem('emat_navigation_logs', JSON.stringify(logs));
        }
    }, [location, Pages, mainPageKey]);

    return null;
}