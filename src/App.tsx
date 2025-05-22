import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import OnBoard from "./pages/OnBoard"; // Home page
import Home from "./pages/Home"; // Home page
import AiStylist from "./pages/AiStylist"; // AI Stylist page
import { useLocation } from "react-router-dom";
import { initGA, trackPageview } from "./lib/analytics";

function App() {
  const location = useLocation();

  useEffect(() => {
    initGA(); // only once
  }, []);

  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/onboard" element={<OnBoard />} />
      <Route path="/ai-stylist" element={<AiStylist />} />
    </Routes>
  );
}

export default App;
