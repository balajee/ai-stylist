import React, { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  ChartOptions,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import "chart.js/auto";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

const labels = [
  "Weather",
  "Local Trending",
  "User Preference",
  "SkinTone",
  "Face Shape",
];

const minValues = [0.5, 0.5, 0.6, 0.4, 0.6];
const maxValues = [1.0, 0.9, 1.0, 0.8, 1.0];
const dotColors = ["#ff6384", "#36a2eb", "#ffcd56", "#4bc0c0", "#9966ff"];

const AiStylistRadar: React.FC = () => {
  const chartRef = useRef<ChartJS<"radar"> | null>(null);

  let pulseRadius = 3;
  let grow = true;

  useEffect(() => {
    const chartInstance = chartRef.current;
    if (!chartInstance) return;

    const animatePulse = () => {
      pulseRadius += grow ? 0.2 : -0.2;
      if (pulseRadius > 6) grow = false;
      if (pulseRadius < 3) grow = true;

      chartInstance.update(); // TS now knows this isn't null
      requestAnimationFrame(animatePulse);
    };

    animatePulse();
  }, []);

  useEffect(() => {
    const chartInstance = chartRef.current;
    if (!chartInstance) return;

    try {
      const fluctuateValues = () => {
        const data = chartInstance.data.datasets[0].data;
        const i = Math.floor(Math.random() * data.length);
        const change = (Math.random() - 0.5) * 0.2;
        if (!data || !data[i]) return;
        let newVal = data && data.length > 0 ? data[i] + change : 0;
        newVal = Math.min(maxValues[i], Math.max(minValues[i], newVal));
        data[i] = newVal;
        chartInstance.update();
        setTimeout(fluctuateValues, 200);
      };

      setTimeout(fluctuateValues, 2000);
    } catch (error) {
      console.error("Error in fluctuateValues:", error);
    }
  }, []);

  const chartData = {
    labels,
    datasets: [
      {
        label: "",
        data: [0.8, 0.7, 0.9, 0.6, 0.85],
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
        pointBackgroundColor: dotColors,
        pointRadius: 4,
        fill: true,
      },
    ],
  };

  const chartOptions: ChartOptions<"radar"> = {
    animation: {
      duration: 1500,
      easing: "easeOutQuart",
    },
    scales: {
      r: {
        angleLines: { color: "rgba(255,255,255,0.2)" },
        grid: { color: "rgba(255,255,255,0.2)" },
        pointLabels: {
          display: false, // hide chart labels
        },
        suggestedMin: 0,
        suggestedMax: 1,
        ticks: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  const radiusPercent = 42;

  return (
    <div
      style={{
        position: "relative",
        width: "90vw",
        maxWidth: "600px",
        height: "90vw",
        maxHeight: "600px",
        backgroundColor: "#000000",
        fontFamily: "Inter, sans-serif",
        margin: "0 auto",
      }}
    >
      <Radar ref={chartRef} data={chartData} options={chartOptions} />

      {/* Center title */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "16px",
          textAlign: "center",
        }}
      >
        AI STYLIST
      </div>

      {/* Floating label boxes */}
      {labels.map((label, i) => {
        const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
        const x = 50 + radiusPercent * Math.cos(angle);
        const y = 50 + radiusPercent * Math.sin(angle);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              backgroundColor: "#1f1f1f",
              color: "#fff",
              padding: "6px 10px",
              borderRadius: "8px",
              fontSize: "13px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};

export default AiStylistRadar;
