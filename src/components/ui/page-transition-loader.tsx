"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

// Configure nprogress
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

export function PageTransitionLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Start NProgress on any route change
    NProgress.start();
    
    // Complete NProgress once the browser has painted
    requestAnimationFrame(() => {
      NProgress.done();
    });

    // Cleanup in case the component unmounts before finishing
    return () => {
      NProgress.done();
    };
  }, [pathname, searchParams]);

  return null;
}
