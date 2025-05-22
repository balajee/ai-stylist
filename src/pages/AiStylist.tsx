import { useState, useEffect } from "react";
import { Modal, ModalBody } from "flowbite-react";
import AiAvatar from "../components/AiAvatar";

interface FashionProduct {
  id: string;
  brand: string;
  description: string;
  productDisplayName: string | null;
  category_gender: string;
  masterCategory: string | null;
  subCategory: string | null;
  articleType: string | null;
  baseColour: string | null;
  season: string | null;
  year: number | null;
  usage: string | null;
  imageURL: string;
  productURL: string;
  discountPrice: number | string; // Can be number if parsed
  originalPrice: number | string;
  provider: "ajio" | "myntra" | "trends";
}

interface UserData {
  gender: string;
  brands: string[];
  categories: string[];
  styles?: string[];
  weather: {
    main: {
      temp: number;
    };
    weather: { description: string }[];
    name: string;
  };
  city: string;
}

type ProductStatus = {
  liked: boolean;
  disliked: boolean;
};

const styleScanMessages = [
  "Scanning weather and vibes…",
  "Pairing your mood with the forecast…",
  "Matching colors to your glow…",
  "Finding styles that flatter your shape…",
  "Mixing trends with your taste…",
  "Fresh fits are on their way…",
  "Checking what’s hot near you…",
  "Styling your day, one piece at a time…",
  "Pulling 10 perfect picks…",
  "Your closet upgrade is loading…",
];

function AiStylist() {
  const [userData, setUserData] = useState<UserData | null>(null);

  const [openModal, setOpenModal] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [productList, setProductList] = useState<FashionProduct[]>([]);

  const getSeasonFromTemp = (temp: number) => {
    if (temp >= 25) return "summer";
    if (temp <= 10) return "winter";
    return "spring or autumn";
  };

  const getData = async (userSearch: string, userData: UserData) => {
    const temp = userData?.weather?.main?.temp ?? 0;

    // Infer season from temperature

    const postRawData = {
      brand: userData.brands,
      category_gender: userData.gender,
      masterCategory: userData.styles,
      subCategory: userData.categories,
      season: getSeasonFromTemp(temp),
    };

    try {
      const response = await fetch(import.meta.env.VITE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ search: userSearch, postRawData }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API Error ${response.status}: ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();

      let filteredItems = data.items || [];

      if (userData) {
        filteredItems = filteredItems.filter(
          (item: FashionProduct) =>
            item.category_gender?.toLowerCase() ===
            userData.gender?.toLowerCase(),
        );
      }

      setProductList(filteredItems);
      setIsLoading(false);
    } catch (error: unknown) {
      console.error("Error fetching stylist data:", error);
      setIsLoading(false);
      // Optionally:
      // setError(error.message);
    }
  };

  const searchData = async (userSearch: string) => {
    if (!userData) return;
    setIsLoading(true);
    await getData(userSearch, userData);
    setOpenModal(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setRandomIndex((prev) => (prev + 1) % styleScanMessages.length);
    }, 500);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    let hasFetched = false;

    const userData = localStorage.getItem("userData");
    const userDataParsed = JSON.parse(userData || "{}");

    setUserData(userDataParsed);

    const fetchUserData = async () => {
      if (hasFetched) return; // prevent double-fetch
      hasFetched = true;

      if (!userDataParsed || Object.keys(userDataParsed).length === 0) {
        window.location.href = "/";
      } else {
        const userSearch = getSearchQuery(userDataParsed);
        getData(userSearch, userDataParsed);
      }
    };
    fetchUserData();
  }, []);

  const suggestions = userData
    ? [
        `Show me ${userData.gender}'s budget-friendly outfit.`,
        `Recommend something for a ${userData.gender} in this weather.`,
        `Suggest top brands for ${userData.gender}'s casual wear.`,
      ]
    : [];

  const getSearchQuery = (userData: UserData) => {
    const location = userData?.city || "";
    const temp = userData?.weather?.main?.temp ?? 0;
    // const brand = userData?.brands?.join(" or ") || "";
    const categories = userData?.categories?.join(" or ") || "";
    const gender = userData?.gender || "";

    const season = getSeasonFromTemp(temp);

    const searchText = `give me random ${gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : ""}'s ${categories} outfit from any brand suitable for ${season} in ${location}.`;

    return searchText.trim();
  };

  const [status, setStatus] = useState<Record<string, ProductStatus>>({});

  const toggleDislike = (id: string) => {
    setStatus((prev) => ({
      ...prev,
      [id]: {
        liked: false,
        disliked: !prev[id]?.disliked,
      },
    }));
  };

  const toggleLike = (id: string) => {
    setStatus((prev) => ({
      ...prev,
      [id]: {
        disliked: false,
        liked: !prev[id]?.liked,
      },
    }));
  };

  const [randomIndex, setRandomIndex] = useState(0);

  return (
    <main className="dark flex min-h-screen flex-col items-center bg-white px-4 py-4 dark:bg-black dark:text-white">
      <div className="relative flex w-full max-w-5xl flex-col gap-2">
        <div className="flex w-full items-center justify-between">
          <h1 className="uppercase">AI Stylist</h1>
        </div>

        <div className="py-5">
          <div className="relative w-full">
            <div className="absolute top-[5px] right-2">
              <img src="/wash.svg" />
            </div>
            <input
              className="via-zinc-850 w-full rounded-full border-1 border-zinc-700 bg-gradient-to-r from-zinc-800 to-zinc-950 py-2 pl-5 text-gray-200 focus:border-none focus:ring-0 focus:outline-none"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchData(searchText); // Pass typed text on Enter
                }
              }}
              onClick={() => setOpenModal(true)}
              placeholder="Ask Me about the style"
            />
          </div>
        </div>

        <Modal
          dismissible
          show={openModal}
          onClose={() => setOpenModal(false)}
          className="bg-black/95 p-0 transition-all"
        >
          <ModalBody className="dark bg-black p-0 pb-8 text-gray-200">
            <div className="relative w-full">
              <div className="absolute top-[5px] right-2">
                <img src="/wash.svg" />
              </div>
              <input
                className="via-zinc-850 w-full rounded-full border-1 border-zinc-700 bg-gradient-to-r from-zinc-800 to-zinc-950 py-2 pl-5 text-gray-200 focus:border-none focus:ring-0 focus:outline-none"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    searchData(searchText);
                  }
                }}
                placeholder="Ask Me about the style"
              />
            </div>
            <div className="pt-5">
              <h3 className="pb-2 pl-2 text-xs font-bold">Most Searched</h3>
              <ul>
                {suggestions.map((item: string, index: number) => (
                  <li
                    key={index}
                    onClick={() => searchData(item)}
                    className="mb-2 flex cursor-pointer justify-between gap-2 rounded-lg bg-zinc-900 p-5 text-xs hover:bg-zinc-800"
                  >
                    <span>{item}</span>
                    <img src="/arrow_top_right.svg" className="h-3" />
                  </li>
                ))}
              </ul>
            </div>
          </ModalBody>
        </Modal>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center pt-20">
            <AiAvatar className="w-18" />
            <span className="text-md pt-4 text-gray-500">
              {styleScanMessages[randomIndex]}
            </span>
          </div>
        ) : (
          <>
            {productList.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-20">
                <span className="text-md pt-4 text-gray-500">
                  oops! since its prototype we use free version and its
                  overloaded currently. You might need to wait for another 15
                  minutes.
                </span>
              </div>
            ) : (
              <>
                <h2 className="text-2xl capitalize">
                  Perfect Outfit for Today
                </h2>
                <div className="weather flex gap-5">
                  {userData?.weather?.main?.temp && (
                    <p>
                      {userData.weather.main.temp}
                      <sup>o</sup>
                      <span>C</span>
                    </p>
                  )}
                  {userData?.weather?.weather?.[0]?.description && (
                    <p>{userData.weather.weather[0].description}</p>
                  )}
                  {userData?.weather?.name && (
                    <p className="border-l-1 pl-3 text-gray-400">
                      {userData.weather.name}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-5 py-10">
                  <img src="/ai-icon-color.svg" alt="" className="h-10" />
                  <p>
                    Recommeding based on Today's weather and your preference
                  </p>
                </div>

                <div className="grid gap-y-20 md:grid-cols-3 md:gap-3 xl:min-h-[300px] xl:grid-cols-4 xl:gap-y-10">
                  {productList.map((product) => (
                    <div key={product.id} className="rounded-lg bg-white p-2">
                      <div className="relative flex items-center justify-center rounded-lg">
                        <img
                          src={
                            product.provider === "myntra"
                              ? product.productURL
                              : product.imageURL
                          }
                          alt={product.description}
                          className="h-full min-h-96 w-full object-contain md:min-h-32"
                          onError={(e) => {
                            e.currentTarget.src = "/camera.svg"; // Path to your default/fallback image
                          }}
                        />
                        {product.brand && (
                          <p className="absolute bottom-0 left-0 rounded-tr-sm bg-white p-1 px-3 text-xs text-gray-500 uppercase">
                            {product.brand}
                          </p>
                        )}
                        {/* Dislike Button */}
                        <button
                          onClick={() => toggleDislike(product.id)}
                          className="absolute right-5 bottom-25 flex h-12 w-12 items-center justify-center rounded-full bg-white drop-shadow-lg"
                        >
                          <img
                            src={
                              status[product.id]?.disliked
                                ? "/dislike-selected.svg"
                                : "/dislike-normal.svg"
                            }
                            alt="dislike"
                            className="h-5"
                          />
                        </button>

                        {/* Like Button */}
                        <button
                          onClick={() => toggleLike(product.id)}
                          className="absolute right-5 bottom-5 flex h-12 w-12 items-center justify-center rounded-full bg-white drop-shadow-lg"
                        >
                          <img
                            src={
                              status[product.id]?.liked
                                ? "/heart-selected.svg"
                                : "/heart-normal.svg"
                            }
                            alt="like"
                            className="h-5"
                          />
                        </button>
                      </div>
                      <div className="flex-cols flex gap-2 pt-3">
                        <div className="flex w-2/3 flex-col gap-1">
                          {product.description && (
                            <p className="text-sm font-semibold text-zinc-600">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <p className="flex w-1/3 flex-col text-end text-sm font-semibold text-black">
                          {product.discountPrice && (
                            <span>Rs.{product.discountPrice}</span>
                          )}
                          {product.originalPrice && (
                            <span className="line-through">
                              Rs.{product.originalPrice}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-between pt-4 pb-2">
                        <div className="flex gap-1 text-xs text-black">
                          <img src="/ai-color.svg" alt="" className="h-4" />
                          <span>Try this on me</span>
                        </div>

                        {product.productURL && (
                          <a
                            href={product.productURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-row gap-1 rounded-md bg-black px-2 py-2 text-white hover:bg-blue-600"
                          >
                            <img src="/cart.svg" alt="" className="h-4" />
                            <span className="text-xs font-bold uppercase">
                              Buy Now
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default AiStylist;
