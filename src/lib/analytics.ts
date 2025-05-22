// src/lib/analytics.ts
import ReactGA from "react-ga4";

const MEASUREMENT_ID = import.meta.env.VITE_GOOGLE_ANALYTICS; // Replace with your actual ID

export const initGA = (): void => {
  ReactGA.initialize(MEASUREMENT_ID);
};

export const trackPageview = (url: string): void => {
  ReactGA.send({ hitType: "pageview", page: url });
};
