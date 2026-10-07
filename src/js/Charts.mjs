// Charts.mjs
// Renders a price-history line chart as inline SVG (no dependency).
// history: array of numbers, oldest to most recent.

export function renderLineChart(history, container, options = {}) {
  const width = options.width || 600;
  const height = options.height || 220;
  const padding = 24;
  // const lineColor = options.color || "#f4a261";

  if (!history || history.length === 0) {
    container.innerHTML = '<p style="opacity:.6">No chart data available.</p>';
    return;
  }

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history.map((value, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y =
      height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(" ");

  const isUp = history[history.length - 1] >= history[0];
  const strokeColor = isUp ? "#2c7a4d" : "#dc3545";

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Price history chart">
      <polygon points="${areaPoints}" fill="${strokeColor}" opacity="0.08"></polygon>
      <polyline points="${points.join(" ")}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
      <text x="${padding}" y="16" font-size="11" fill="currentColor" opacity="0.6">${max.toFixed(2)}</text>
      <text x="${padding}" y="${height - 8}" font-size="11" fill="currentColor" opacity="0.6">${min.toFixed(2)}</text>
    </svg>
  `;
}

// Sparkline — a tiny line chart for stock cards.

export function renderSparkline(history, container, options = {}) {
  const width = options.width || 120;
  const height = options.height || 30;
  const padding = 2;

  if (!history || history.length < 2) {
    container.innerHTML = "";
    return;
  }

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history.map((value, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y =
      height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const isUp = history[history.length - 1] >= history[0];
  const strokeColor = isUp ? "#2c7a4d" : "#dc3545";

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="30-day price trend">
      <polyline points="${points.join(" ")}" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"></polyline>
    </svg>
  `;
}
