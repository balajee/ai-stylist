import ReactGA from "react-ga4";
import { useState, useEffect } from "react";
import { TextInput, Button } from "flowbite-react";
import { useNavigate } from "react-router-dom";
import rawList from "../data/list.json";
import classNames from "classnames";
import AiAvatar from "../components/AiAvatar";
import TypewriterText from "../components/TypewriterText";
import FaceAnalyzer from "../components/FaceAnalyzer";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { type FaceInfo } from "../lib/interface";

interface DbList {
  [gender: string]: {
    [category: string]: {
      [brand: string]: number;
    };
  };
}

const list = rawList as DbList;

interface UserData {
  weather: WeatherData | null; // Replace 'any' with the actual weather type if possible
  city: string;
  gender: string;
  categories: string[]; // Ensure categories is an array of strings
  styles: string[];
  brands: string[];
}

interface WeatherData {
  name: string;
  main: {
    temp: number;
    humidity: number;
  };
  weather: { description: string }[];
}

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

export default function OnBoard() {
  const [userData, setUserData] = useState<UserData>({
    weather: null,
    city: "",
    gender: "",
    categories: [],
    styles: [],
    brands: [],
  });

  const [city, setCity] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{ name: string; country: string }>
  >([]);
  //const [weather, setWeather] = useState<WeatherData | null>(null);
  const [visibleBrandCount, setVisibleBrandCount] = useState(8);

  const genderBasedCategories = userData.gender
    ? Object.keys(list[userData.gender] || {})
    : [];

  const filteredBrands = (() => {
    if (!userData.gender || userData.categories.length === 0) return [];

    const categoryData = list[userData.gender]; // e.g., list["Men"]
    const brandCountMap: Record<string, number> = {};

    userData.categories.forEach((cat) => {
      const categoryName = Object.keys(categoryData).find(
        (k) => k.toLowerCase().replace(/\s+/g, "_") === cat,
      );

      if (categoryName && categoryData[categoryName]) {
        const brands = categoryData[categoryName];
        Object.entries(brands).forEach(([brand, count]) => {
          brandCountMap[brand] = (brandCountMap[brand] || 0) + count;
        });
      }
    });

    // Convert map to sorted array of brands
    return Object.entries(brandCountMap)
      .sort((a, b) => b[1] - a[1])
      .map(([brand]) => brand);
  })();

  const [step, setStep] = useState(1);

  // Fetch city suggestions
  const fetchCitySuggestions = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`,
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Error fetching city suggestions:", error);
    }
  };

  useEffect(() => {
    const temp = localStorage.getItem("temp");
    const weather = localStorage.getItem("weather");
    const city = localStorage.getItem("city");
    if (temp && weather && city) {
      setStep(2);
    }
  }, []);

  // Fetch weather when a city is selected
  const fetchWeather = async (selectedCity: string) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${selectedCity}&units=metric&appid=${API_KEY}`,
      );
      const data = await response.json();

      localStorage.setItem("temp", data?.main?.temp);
      localStorage.setItem("weather", data?.weather[0]?.description);
      localStorage.setItem("city", city);

      setSuggestions([]); // Clear suggestions after selection
      setUserData((prev: UserData) => ({
        ...prev,
        weather: data?.weather[0]?.description,
        city: city,
      }));
      setStep(2);
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  // Handle input change and fetch suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCity(value);
    fetchCitySuggestions(value);
  };

  // Handle city selection from suggestions
  const handleSelectCity = (selectedCity: string) => {
    setCity(selectedCity);
    fetchWeather(selectedCity);
  };

  const handleGenderClick = (selectedGender: string) => {
    setStep(6);
    setUserData((prev: UserData) => ({
      ...prev,
      gender: selectedGender,
    }));
    ReactGA.event({
      category: "Navigation",
      action: "Gender Clicked",
      label: `Gender - ${selectedGender}`,
      value:
        selectedGender === "Female" ? 1 : selectedGender === "Male" ? 2 : 3,
    });
  };

  const handleCategoryClick = (selectedCategory: string) => {
    setUserData((prev: UserData) => {
      const currentCategories = prev.categories || [];

      // Toggle category selection (Add if not in array, remove if already selected)
      const updatedCategories = currentCategories.includes(selectedCategory)
        ? currentCategories.filter((item: string) => item !== selectedCategory) // Remove item
        : [...currentCategories, selectedCategory]; // Add item

      const isSelected = currentCategories.includes(selectedCategory);

      // Track with Google Analytics
      ReactGA.event({
        category: "Preferences",
        action: isSelected ? "Category Deselected" : "Category Selected",
        label: `Category - ${selectedCategory}`,
      });

      return {
        ...prev,
        categories: updatedCategories, // Correctly updated array
      };
    });
  };

  const handleStylesClick = (selected: string) => {
    setUserData((prev: UserData) => {
      const current = prev.styles || [];
      const updated = current.includes(selected)
        ? current.filter((item: string) => item !== selected) // Remove item
        : [...current, selected]; // Add item

      const isSelected = current.includes(selected);
      ReactGA.event({
        category: "Preferences",
        action: isSelected ? "Style Deselected" : "Style Selected",
        label: `Style - ${selected}`,
      });

      return {
        ...prev,
        styles: updated, // Correctly updated array
      };
    });
  };

  const handleBrandsClick = (selected: string) => {
    setUserData((prev: UserData) => {
      const current = prev.brands || [];
      const updated = current.includes(selected)
        ? current.filter((item: string) => item !== selected) // Remove item
        : [...current, selected]; // Add item

      const isSelected = current.includes(selected);
      // GA4 event tracking
      ReactGA.event({
        category: "Preferences",
        action: isSelected ? "Brand Deselected" : "Brand Selected",
        label: `Brand - ${selected}`,
      });

      return {
        ...prev,
        brands: updated, // Correctly updated array
      };
    });
  };

  const [faceInfo, setFaceInfo] = useState<FaceInfo>();

  const faceCallback = (info: FaceInfo) => {
    console.log(info);
    setFaceInfo(info);
    setUserData((prev) => ({
      ...prev,
      gender: info.gender ?? "", // fallback to empty string to match the type
    }));
  };

  const navigate = useNavigate();
  const submitAi = async () => {
    console.log(userData);
    localStorage.setItem("userData", JSON.stringify(userData));

    ReactGA.event({
      category: "Onboarding",
      action: "AI Stylist Submitted",
      label: "Final Submit",
      value: Object.keys(userData).length, // Optional: number of fields filled
    });

    if (faceInfo) {
      localStorage.setItem("faceInfo", JSON.stringify(faceInfo));
    }

    navigate("/ai-stylist");
    /*
    try {
      const response = await fetch("https://api.example.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      console.log("AI Stylist created:", data);
    } catch (error) {
      console.error("Error creating AI Stylist:", error);
    }
    */
  };

  const generalClass = classNames(
    "dark:peer-checked:text-white inline-flex h-full w-full cursor-pointer items-center justify-between rounded-lg border-2 border-transparent p-2 text-gray-500 peer-checked:border-white peer-checked:text-white hover:border-gray-300 hover:text-gray-600 dark:border-zinc-800 dark:text-gray-400 dark:peer-checked:border-white dark:peer-checked:bg-gradient-to-t dark:peer-checked:from-white/15 dark:peer-checked:via-transparent dark:peer-checked:to-black/90 dark:hover:border-gray-500 dark:hover:text-gray-300 bg-zinc-900",
  );

  const butonclass = classNames(
    "cursor-pointer rounded-lg !bg-white px-10 !py-6 text-black uppercase",
  );

  const [showStep1, setShowStep1] = useState(false);
  const [showStep2, setShowStep2] = useState(false);
  const [showStep3, setShowStep3] = useState(false);
  const [showStep4, setShowStep4] = useState(false);
  const [showStep5, setShowStep5] = useState(false);
  const [showStep6, setShowStep6] = useState(false);

  const resetAllStep = () => {};

  const motionConfig = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 1 },
    className: "relative flex flex-col items-center justify-center gap-2",
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      console.log(position.coords);
      // Use OpenCage (or Nominatim or Google Maps API)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      );

      console.log(response);

      const cityName =
        response.data.results[0].components.city ||
        response.data.results[0].components.town ||
        response.data.results[0].components.village;

      if (cityName) setCity(cityName);
    });
  }, []);

  return (
    <main className="dark flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-black dark:text-white">
      <AnimatePresence mode="wait">
        <div className="w-full max-w-xl py-24">
          <motion.div key="step1" {...motionConfig}>
            {step === 1 && (
              <div className="relative flex flex-col items-center justify-center gap-2">
                <AiAvatar />
                <h3 className="my-3 text-sm text-gray-400">Hello there!</h3>
                <div className="flex items-center justify-center text-center">
                  <TypewriterText
                    text="Tell me your city, I'll tailor to the weather."
                    onDone={() => {
                      setShowStep1(true);
                      resetAllStep();
                    }}
                  />
                </div>

                <div
                  className={classNames(
                    "transform transition-all duration-700",
                    showStep1
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-10 opacity-0",
                    "animate_container w-full md:w-1/2",
                  )}
                >
                  <div className="relative my-8">
                    <div
                      style={{
                        backgroundImage:
                          "linear-gradient(white, white), linear-gradient(156.24deg, rgba(255, 255, 255, 0.4) 4.94%, rgba(255, 255, 255, 0.05) 160.99%)",
                        backgroundOrigin: "border-box",
                        backgroundClip: "content-box, border-box",
                        border: "1px solid transparent",
                        borderRadius: "12px", // Ensures rounded corners
                        padding: "1px", // Prevents content from overlapping the border
                      }}
                      className="w-full"
                    >
                      <TextInput
                        type="text"
                        sizing="lg"
                        value={city}
                        onChange={handleInputChange}
                        placeholder="Enter your location"
                        style={{
                          borderRadius: "10px", // Ensures the inner input is rounded
                          border: "none",
                        }}
                      />
                    </div>
                    {suggestions.length > 0 && (
                      <ul className="absolute z-10 mt-1 mr-4 w-full rounded-lg bg-white shadow-lg dark:bg-black">
                        {suggestions.map(
                          (
                            suggestion: { name: string; country: string },
                            index: number,
                          ) => (
                            <li
                              key={index}
                              className="cursor-pointer border-t px-4 py-2 hover:bg-gray-200 dark:border-gray-700 dark:hover:bg-gray-900"
                              onClick={() => handleSelectCity(suggestion.name)}
                            >
                              {suggestion.name}, {suggestion.country}
                            </li>
                          ),
                        )}
                      </ul>
                    )}

                    <p className="px-10 pt-5 text-center text-sm opacity-60">
                      Used once. Never stored. Just to check the weather and
                      style your day.
                    </p>
                  </div>
                </div>

                {/*
          {weather && weather.main && (
            <div className="mt-4 rounded-lg bg-gray-800 p-4 text-white">
              <h3 className="text-lg font-bold">{weather.name}</h3>
              <p>Temperature: {weather.main.temp}°C</p>
              <p>Condition: {weather.weather[0].description}</p>
            </div>
          )}
            */}
              </div>
            )}
          </motion.div>
          {step === 2 && (
            <>
              <div className="absolute top-0 left-0 flex items-center justify-center">
                <img
                  src="/back.svg"
                  alt=""
                  className="mt-8 ml-8 w-3 cursor-pointer"
                  onClick={() => {
                    setStep(1);
                    resetAllStep();
                  }}
                />
              </div>

              <motion.div key="step6" {...motionConfig}>
                <AiAvatar className="w-18" />
                <div className="flex items-center justify-center pt-4 text-center">
                  <TypewriterText
                    text="One quick scan to get your style right."
                    onDone={() => {
                      setShowStep2(true);
                    }}
                  />
                </div>

                <div
                  className={classNames(
                    "flex transform flex-col items-center justify-center transition-all duration-700",
                    showStep2
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-10 opacity-0",
                    "animate_container w-full md:w-2/3",
                  )}
                >
                  <p className="pt-6 text-center text-gray-400">
                    <b className="text-white">Face shape + Skin tone</b> help
                    style you better!
                  </p>
                  <div className="aspect-[2/2] w-full">
                    <FaceAnalyzer callback={faceCallback} />
                  </div>
                  <p className="mb-10 text-center text-sm text-gray-500">
                    Real-time only. Nothing saved. Nothing shared.
                  </p>

                  {/* Next Button */}
                  <Button
                    className={butonclass}
                    onClick={() => {
                      setStep(6);
                      console.log(userData);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </motion.div>
            </>
          )}

          {step === 3 && (
            <>
              {/* Back Button */}
              <div className="absolute top-0 left-0 flex items-center justify-center">
                <img
                  src="/back.svg"
                  alt=""
                  className="mt-8 ml-8 w-3 cursor-pointer"
                  onClick={() => {
                    setStep(2);
                    resetAllStep();
                  }}
                />
              </div>

              <motion.div key="step3" {...motionConfig}>
                <AiAvatar />
                <div className="flex items-center justify-center pt-4 text-center">
                  <TypewriterText
                    text="What do you shop for most?"
                    onDone={() => {
                      setShowStep3(true);
                      resetAllStep();
                    }}
                  />
                </div>

                <div
                  className={classNames(
                    "flex transform flex-col items-center justify-center transition-all duration-700",
                    showStep3
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-10 opacity-0",
                    "animate_container w-full md:w-2/3",
                  )}
                >
                  {/* Categories Selection */}
                  <ul className="my-10 grid w-full grid-cols-2 gap-3">
                    {genderBasedCategories.map((category) => {
                      const id = category.toLowerCase().replace(/\s+/g, "_"); // normalize id
                      return (
                        <li key={id} className="h-26">
                          <input
                            type="checkbox"
                            id={id}
                            name="category"
                            value={id}
                            checked={userData.categories.includes(id)}
                            onChange={() => handleCategoryClick(id)}
                            className="peer hidden"
                            required
                          />
                          <label htmlFor={id} className={generalClass}>
                            <div className="block w-full flex-col items-center overflow-hidden text-center text-ellipsis capitalize">
                              {category}
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Next Button */}
                  <Button
                    className={butonclass}
                    onClick={() => setStep(4)}
                    disabled={userData.categories.length === 0}
                  >
                    Next
                  </Button>
                </div>
              </motion.div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="absolute top-0 left-0 flex items-center justify-center">
                <img
                  src="/back.svg"
                  alt=""
                  className="mt-8 ml-8 w-3 cursor-pointer"
                  onClick={() => {
                    setStep(3);
                    resetAllStep();
                  }}
                />
              </div>

              <motion.div key="step4" {...motionConfig}>
                <AiAvatar />
                <div className="flex items-center justify-center pt-4 text-center">
                  <TypewriterText
                    text="What's your preferred style?"
                    onDone={() => {
                      setShowStep4(true);
                    }}
                  />
                </div>

                <div
                  className={classNames(
                    "flex transform flex-col items-center justify-center transition-all duration-700",
                    showStep4
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-10 opacity-0",
                    "animate_container w-full md:w-2/3",
                  )}
                >
                  {/* Style Selection */}
                  <ul className="my-10 grid w-full grid-cols-2 gap-3">
                    {[
                      "casual",
                      "business",
                      "trendy",
                      "minimalist",
                      "luxury",
                      "budget",
                    ].map((style) => (
                      <li key={style} className="h-24">
                        <input
                          type="checkbox"
                          id={style}
                          name="style"
                          value={style}
                          className="peer hidden"
                          checked={userData.styles.includes(style)}
                          onChange={() => handleStylesClick(style)}
                          required
                        />

                        <label htmlFor={style} className={generalClass}>
                          <div className="block w-full flex-col items-center overflow-hidden text-center text-ellipsis capitalize">
                            {style}
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>

                  {/* Next Button */}
                  <Button
                    className={butonclass}
                    onClick={() => setStep(5)}
                    disabled={userData.styles.length === 0}
                  >
                    Next
                  </Button>
                </div>
              </motion.div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="absolute top-0 left-0 flex items-center justify-center">
                <img
                  src="/back.svg"
                  alt=""
                  className="mt-8 ml-8 w-3 cursor-pointer"
                  onClick={() => {
                    setStep(4);
                    resetAllStep();
                  }}
                />
              </div>

              <motion.div key="step5" {...motionConfig}>
                <AiAvatar />
                <div className="flex items-center justify-center pt-4 text-center">
                  <TypewriterText
                    text="Your go-to brands?"
                    onDone={() => {
                      setShowStep5(true);
                    }}
                  />
                </div>

                <div
                  className={classNames(
                    "flex transform flex-col items-center justify-center transition-all duration-700",
                    showStep5
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-10 opacity-0",
                    "animate_container w-full md:w-2/3",
                  )}
                >
                  {/* Brand Selection */}
                  <ul className="mt-10 mb-6 grid w-full grid-cols-2 gap-3">
                    {filteredBrands.slice(0, visibleBrandCount).map((brand) => (
                      <li key={brand} className="h-24">
                        <input
                          type="checkbox"
                          id={brand}
                          name="brand"
                          value={brand}
                          className="peer hidden"
                          checked={userData.brands.includes(brand)}
                          onChange={() => handleBrandsClick(brand)}
                          required
                        />

                        <label htmlFor={brand} className={generalClass}>
                          <div className="block w-full flex-col items-center overflow-hidden text-center text-ellipsis capitalize">
                            {brand}
                          </div>
                        </label>
                      </li>
                    ))}
                    {visibleBrandCount < filteredBrands.length && (
                      <li
                        className="h-24"
                        onClick={() => setVisibleBrandCount((prev) => prev + 8)}
                      >
                        <label className={`${generalClass} !border-0`}>
                          <div className="block w-full flex-col items-center text-center">
                            <div className="flex items-center justify-center gap-3">
                              <span className="text-xs font-bold uppercase">
                                More
                              </span>
                              <img
                                src="/back.svg"
                                alt=""
                                className="h-4 -rotate-90"
                              />
                            </div>
                          </div>
                        </label>
                      </li>
                    )}
                  </ul>

                  <p className="mb-10 px-6 text-center text-sm opacity-60">
                    While we aim for the best, AI images may sometimes have
                    inaccuracies
                  </p>

                  <Button
                    className={butonclass}
                    onClick={() => setStep(6)}
                    disabled={userData.brands.length === 0}
                  >
                    Next
                  </Button>
                </div>
              </motion.div>
            </>
          )}

          {step === 6 && (
            <>
              <div className="absolute top-0 left-0 flex items-center justify-center">
                <img
                  src="/back.svg"
                  alt=""
                  className="mt-8 ml-8 w-3 cursor-pointer"
                  onClick={() => {
                    setStep(2);
                    resetAllStep();
                  }}
                />
              </div>
              <motion.div key="step2" {...motionConfig}>
                <AiAvatar />
                <div className="flex items-center justify-center pt-4 text-center">
                  <TypewriterText
                    text="Let's begin who are we styling?"
                    onDone={() => {
                      setShowStep6(true);
                    }}
                  />
                </div>

                <div
                  className={classNames(
                    "flex transform flex-col items-center justify-center transition-all duration-700",
                    showStep6
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-10 opacity-0",
                    "animate_container w-full md:w-1/2",
                  )}
                >
                  <ul className="mt-10 grid h-36 w-86 grid-cols-2 gap-6">
                    {/* Men's Fashion */}
                    <li>
                      <input
                        type="radio"
                        id="Men"
                        name="gender"
                        value="Men"
                        className="peer hidden"
                        checked={userData.gender === "Men"}
                        required
                      />
                      <label
                        htmlFor="Men"
                        className={generalClass}
                        onClick={() => handleGenderClick("Men")}
                      >
                        <div className="block w-full flex-col items-center text-center">
                          <img
                            src="/male.svg"
                            alt="Men"
                            className="mx-auto w-10 pb-4"
                          />
                          <div>Men's Fashion</div>
                        </div>
                      </label>
                    </li>

                    {/* Women's Fashion */}
                    <li>
                      <input
                        type="radio"
                        id="Women"
                        name="gender"
                        value="Women"
                        className="peer hidden"
                        checked={userData.gender === "Women"}
                        required
                      />
                      <label
                        htmlFor="Women"
                        className={generalClass}
                        onClick={() => handleGenderClick("Women")}
                      >
                        <div className="block w-full flex-col items-center text-center">
                          <img
                            src="/female.svg"
                            alt="Women"
                            className="mx-auto w-10 pb-4"
                          />
                          <div>Women's Fashion</div>
                        </div>
                      </label>
                    </li>
                  </ul>

                  <p className="mb-8 px-6 pt-5 text-center text-sm opacity-60">
                    We will come back with neutral gender soon!
                  </p>

                  <Button className={butonclass} onClick={() => submitAi()}>
                    Create AI Stylist
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </AnimatePresence>
    </main>
  );
}
