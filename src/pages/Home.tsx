import { useEffect, useState } from "react";
import ReactGA from "react-ga4";
import { Button } from "flowbite-react";
import { useNavigate } from "react-router-dom";
import AiStylistRadar from "../components/AiStylistRadarV2";
import TypewriterText from "../components/TypewriterText";
import axios from "axios";

const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

export default function Home() {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  const submitAi = async () => {
    ReactGA.event({
      category: "Navigation",
      action: "Clicked Get Started",
      label: "Home Page",
    });

    // Optionally pass the city via router or save to localStorage
    localStorage.setItem("userCity", city);
    navigate("/onboard");
  };

  const fetchWeather = async (lat: number, long: number) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${long}&appid=${WEATHER_API_KEY}&units=metric`,
      );
      const data = await response.json();
      localStorage.setItem("temp", data?.main?.temp);
      localStorage.setItem("weather", data?.weather[0]?.description);
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLoading(true); // 👈 Start loading immediately
        const { latitude, longitude } = position.coords;

        const prevLat = localStorage.getItem("latitude");
        const prevLon = localStorage.getItem("longitude");

        const latChanged = prevLat !== latitude.toString();
        const lonChanged = prevLon !== longitude.toString();

        if (latChanged || lonChanged) {
          await fetchWeather(latitude, longitude);

          try {
            const response = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            );

            const address = response.data.address || {};
            const cityName =
              address.city ||
              address.state_district ||
              address.town ||
              address.village ||
              "";

            if (cityName) {
              const fullCity = `${cityName}, ${address.state}`;
              setCity(fullCity);
              localStorage.setItem("city", fullCity);
            }

            localStorage.setItem("latitude", latitude.toString());
            localStorage.setItem("longitude", longitude.toString());
          } catch (err) {
            console.error("Reverse geocoding failed:", err);
          }
        } else {
          const storedCity = localStorage.getItem("city");
          if (storedCity) setCity(storedCity);
        }

        setLoading(false); // ✅ Done loading either way
      },
      (error) => {
        console.warn("Geolocation error:", error);
        localStorage.removeItem("city");
        localStorage.removeItem("latitude");
        localStorage.removeItem("longitude");
        localStorage.removeItem("temp");
        localStorage.removeItem("weather");
        setCity(""); // Reset city
        setLoading(false); // ✅ Done loading even on error
      },
    );
  }, []);

  useEffect(() => {
    const storedCity = localStorage.getItem("city");
    console.log("Loaded city from localStorage:", storedCity);
    if (storedCity) setCity(storedCity);
  }, []);

  return (
    <main className="dark flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-black dark:text-white">
      <div className="justify-middle flex flex-col items-center p-3">
        <AiStylistRadar />
        <div className="flex flex-col gap-2 text-center">
          <span className="text-3xl">
            Create Your <b>AI Stylist</b>
          </span>
          <span className="flex items-center justify-center gap-2 text-xl">
            <span>Trained on</span>
            <TypewriterText
              text={[
                "⁠local weather",
                "face shape",
                "skin tone",
                "favorite brands",
                "personal style",
                "⁠today's trends",
              ]}
              loop
              speed={70}
              classNm="!text-xl font-bold capitalize"
            />
          </span>
        </div>
        <p className="mt-10 mb-5 text-center">
          Fresh outfits daily, tailored to you.
        </p>
        <Button
          className="cursor-pointer rounded-lg !bg-white px-10 !py-6 text-black uppercase"
          onClick={() => submitAi()}
          disabled={loading}
        >
          Get Started
        </Button>
      </div>
      {city && (
        <p className="mb-2 text-sm text-gray-500">
          📍 Detected: <span className="font-medium">{city}</span>
        </p>
      )}
    </main>
  );
}
