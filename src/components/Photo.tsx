// Painted stand-ins until the November test setups are photographed.
// Replace each use with next/image and a real photo. No stock photos.
export type PhotoKind = "plate" | "cup" | "glass" | "pan" | "kit" | "teapot" | "vase" | "tier";

const china = "#fffdf8";
const outline = "#a98d80";
const leaf = "#6f8f4f";
const leafDark = "#4f6f3a";
const petal = "#f3c3c7";
const rose = "#e39aa5";
const gold = "#c9a65c";

const backgrounds = ["grass", "linen", "gingham", "grass", "butter", "petal"];

function hash(text: string) {
  return [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 9973, 7);
}

const round = (value: number) => Math.round(value * 10) / 10;

function polar(x: number, y: number, r: number, angle: number) {
  return [round(x + r * Math.cos(angle)), round(y + r * Math.sin(angle))];
}

// Small repeatable random numbers, so the page draws the same on server and browser.
function sequence(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state % 1000) / 1000;
  };
}

function grassBlades() {
  const next = sequence(4242);
  const colors = ["#587f3c", "#6d9449", "#86aa5c", "#a2bf72", "#4b7034"];
  return Array.from({ length: 170 }, (_, i) => {
    const x = round(next() * 240);
    const y = round(next() * 240);
    const lean = round((next() - 0.5) * 26);
    const tall = round(14 + next() * 26);
    return (
      <path
        key={i}
        d={`M${x} ${y}q${round(lean / 3)} ${round(-tall / 2)} ${lean} ${-tall}`}
        stroke={colors[i % colors.length]}
        strokeWidth={round(1.2 + next() * 1.6)}
        strokeLinecap="round"
        fill="none"
      />
    );
  });
}

// Shared by every painting on the page. Rendered once in the layout.
export function ArtDefs() {
  return (
    <svg className="art-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter id="soft-edge" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
        </filter>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <radialGradient id="sun" cx="72%" cy="20%" r="85%">
          <stop offset="0" stopColor="#fff8d8" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="#fff8d8" stopOpacity="0.08" />
          <stop offset="1" stopColor="#30401f" stopOpacity="0.1" />
        </radialGradient>
        <radialGradient id="berry" cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#f0605a" />
          <stop offset="0.6" stopColor="#d7322f" />
          <stop offset="1" stopColor="#a71f24" />
        </radialGradient>
        <radialGradient id="bowl" cx="42%" cy="38%" r="65%">
          <stop offset="0" stopColor="#f8dcd9" />
          <stop offset="0.8" stopColor="#f0c5c4" />
          <stop offset="1" stopColor="#e3abaf" />
        </radialGradient>
        <radialGradient id="china-shade" cx="40%" cy="35%" r="72%">
          <stop offset="0" stopColor="#fffefb" />
          <stop offset="0.8" stopColor="#fbf5ec" />
          <stop offset="1" stopColor="#ecdfd2" />
        </radialGradient>
        <radialGradient id="daisy-heart" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f9dc64" />
          <stop offset="1" stopColor="#e2a92c" />
        </radialGradient>
        <radialGradient id="tea" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#c98f5e" />
          <stop offset="1" stopColor="#9d643c" />
        </radialGradient>
        <linearGradient id="tin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ece9e2" />
          <stop offset="0.5" stopColor="#c8c3b8" />
          <stop offset="1" stopColor="#a9a498" />
        </linearGradient>
        <pattern id="grass" width="240" height="240" patternUnits="userSpaceOnUse">
          <rect width="240" height="240" fill="#789e52" />
          {grassBlades()}
        </pattern>
        <pattern id="linen" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#f8ebe4" />
          <path d="M0 2.5H10M0 7.5H10M2.5 0V10M7.5 0V10" stroke="#fff" strokeWidth="1" opacity="0.3" />
        </pattern>
        <pattern id="gingham" width="44" height="44" patternUnits="userSpaceOnUse">
          <rect width="44" height="44" fill="#fffaf5" />
          <rect width="22" height="44" fill={rose} opacity="0.26" />
          <rect width="44" height="22" fill={rose} opacity="0.26" />
        </pattern>
        <pattern id="butter" width="60" height="60" patternUnits="userSpaceOnUse">
          <rect width="60" height="60" fill="#fbf1cf" />
          <circle cx="15" cy="15" r="2" fill="#fff" />
          <circle cx="45" cy="45" r="2" fill="#fff" />
        </pattern>
        <pattern id="petal" width="60" height="60" patternUnits="userSpaceOnUse">
          <rect width="60" height="60" fill="#f7dcdb" />
          <circle cx="15" cy="15" r="2" fill="#fff" />
          <circle cx="45" cy="45" r="2" fill="#fff" />
        </pattern>
      </defs>
    </svg>
  );
}

function Shadow({ x, y, r, ry }: { x: number; y: number; r: number; ry?: number }) {
  return <ellipse cx={x} cy={y} rx={r} ry={ry ?? r} fill="#2c2a18" opacity="0.26" filter="url(#soft-shadow)" />;
}

function Leaf({ x, y, size, angle, fill = leaf }: { x: number; y: number; size: number; angle: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={`M0 0C${size * 0.3} ${-size * 0.34} ${size * 0.8} ${-size * 0.3} ${size} 0C${size * 0.8} ${size * 0.3} ${size * 0.3} ${size * 0.34} 0 0Z`} fill={fill} opacity="0.9" />
      <path d={`M2 0H${size * 0.86}`} stroke={leafDark} strokeWidth="0.8" opacity="0.6" />
    </g>
  );
}

function Daisy({ x, y, r }: { x: number; y: number; r: number }) {
  const count = 15;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <ellipse
          key={i}
          cx={x}
          cy={round(y - r * 0.64)}
          rx={round(r * (i % 2 ? 0.16 : 0.19))}
          ry={round(r * 0.42)}
          fill={i % 3 ? "#fffef9" : "#f6f0e6"}
          stroke="#e5ddcf"
          strokeWidth="0.5"
          transform={`rotate(${round((i * 360) / count)} ${x} ${y})`}
        />
      ))}
      <circle cx={x} cy={y} r={round(r * 0.3)} fill="url(#daisy-heart)" />
    </g>
  );
}

function Strawberry({ x, y, size, angle = 0 }: { x: number; y: number; size: number; angle?: number }) {
  const seeds: [number, number][] = [
    [-0.42, -0.2], [0, -0.3], [0.42, -0.2], [-0.56, 0.16], [-0.2, 0.08], [0.2, 0.08], [0.56, 0.16], [-0.32, 0.44], [0, 0.4], [0.32, 0.44], [-0.12, 0.72], [0.14, 0.72],
  ];
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}>
      <path d="M0 1.08C-0.42 0.96-0.92 0.42-0.86-0.2C-0.8-0.68-0.3-0.7 0-0.56C0.3-0.7 0.8-0.68 0.86-0.2C0.92 0.42 0.42 0.96 0 1.08Z" fill="url(#berry)" />
      <path d="M-0.64-0.32C-0.5-0.5-0.24-0.5-0.1-0.42C-0.3-0.3-0.46-0.14-0.54 0.02Z" fill="#fff" opacity="0.28" />
      {seeds.map(([sx, sy]) => (
        <ellipse key={`${sx}${sy}`} cx={sx} cy={sy} rx="0.03" ry="0.055" fill="#f3d36a" />
      ))}
      {[-62, -30, 0, 30, 62, 95, -95].map((turn) => (
        <path key={turn} d="M0-0.56C0.08-0.72 0.08-0.9 0-1.04C-0.08-0.9-0.08-0.72 0-0.56Z" fill={turn % 60 ? leaf : leafDark} transform={`rotate(${turn} 0 -0.56) scale(1.25) translate(0 0.11)`} />
      ))}
    </g>
  );
}

function Blossom({ x, y, r, fill = petal }: { x: number; y: number; r: number; fill?: string }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => {
        const [px, py] = polar(x, y, r * 0.55, (i / 5) * 2 * Math.PI - Math.PI / 2);
        return <circle key={i} cx={px} cy={py} r={round(r * 0.58)} fill={fill} opacity="0.82" />;
      })}
      <circle cx={x} cy={y} r={round(r * 0.26)} fill={gold} opacity="0.85" />
    </g>
  );
}

function Peony({ x, y, r }: { x: number; y: number; r: number }) {
  const next = sequence(Math.round(x * 13 + y * 7 + 11));
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#f7cfd2" opacity="0.72" />
      {Array.from({ length: 11 }, (_, i) => {
        const distance = r * (0.18 + next() * 0.58);
        const [px, py] = polar(x, y, distance, (i / 11) * 2 * Math.PI + next());
        return <circle key={i} cx={px} cy={py} r={round(r * (0.26 + next() * 0.26))} fill={i % 3 ? "#efa9b2" : "#f9dcdc"} opacity="0.46" />;
      })}
      <circle cx={x} cy={y} r={round(r * 0.26)} fill="#d97c8d" opacity="0.5" />
    </g>
  );
}

function Plate({ x = 200, y = 150, r = 112, pattern = 0 }: { x?: number; y?: number; r?: number; pattern?: number }) {
  const motif = pattern % 3;
  const count = 10;
  return (
    <g>
      <Shadow x={x + 8} y={y + 11} r={r * 0.98} />
      <circle cx={x} cy={y} r={r} fill="url(#china-shade)" stroke={gold} strokeWidth="2.5" />
      <circle cx={x} cy={y} r={round(r * 0.94)} fill="none" stroke={gold} strokeWidth="0.8" />
      <circle cx={x} cy={y} r={round(r * 0.58)} fill="none" stroke="#e4d7c9" strokeWidth="1.5" />
      {motif < 2
        ? Array.from({ length: count }, (_, i) => {
            const angle = (i / count) * 2 * Math.PI;
            const [px, py] = polar(x, y, r * 0.77, angle);
            const [lx, ly] = polar(x, y, r * 0.77, angle + Math.PI / count);
            return (
              <g key={i}>
                <Leaf x={lx} y={ly} size={round(r * 0.17)} angle={round((angle * 180) / Math.PI + 70)} />
                {motif === 0 ? <Blossom x={px} y={py} r={round(r * 0.095)} fill={i % 2 ? petal : rose} /> : <Daisy x={px} y={py} r={round(r * 0.13)} />}
              </g>
            );
          })
        : null}
      {motif === 2 ? (
        <>
          <Peony x={round(x - r * 0.5)} y={round(y - r * 0.5)} r={round(r * 0.28)} />
          <Leaf x={round(x - r * 0.3)} y={round(y - r * 0.56)} size={round(r * 0.3)} angle={15} />
          <Leaf x={round(x - r * 0.62)} y={round(y - r * 0.26)} size={round(r * 0.28)} angle={95} />
          <Blossom x={round(x + r * 0.58)} y={round(y + r * 0.5)} r={round(r * 0.1)} />
          <Daisy x={round(x - r * 0.72)} y={round(y + r * 0.1)} r={round(r * 0.12)} />
        </>
      ) : null}
    </g>
  );
}

function Cup({ x = 200, y = 150, r = 60, pattern = 0 }: { x?: number; y?: number; r?: number; pattern?: number }) {
  return (
    <g>
      <Shadow x={x + 6} y={y + 9} r={r * 1.62} />
      <circle cx={x} cy={y} r={round(r * 1.62)} fill="url(#china-shade)" stroke={gold} strokeWidth="2" />
      {Array.from({ length: 8 }, (_, i) => {
        const [px, py] = polar(x, y, r * 1.32, (i / 8) * 2 * Math.PI + 0.3);
        return <Blossom key={i} x={px} y={py} r={round(r * 0.12)} fill={(i + pattern) % 2 ? petal : rose} />;
      })}
      <path d={`M${x + r * 0.96} ${y - r * 0.3}q${r * 0.66} ${r * 0.3} 0 ${r * 0.6}`} fill="none" stroke={gold} strokeWidth={round(r * 0.11)} strokeLinecap="round" />
      <circle cx={x} cy={y} r={r} fill={china} stroke={outline} strokeWidth="1.5" />
      <circle cx={x} cy={y} r={round(r * 0.8)} fill="url(#tea)" />
      <ellipse cx={round(x - r * 0.26)} cy={round(y - r * 0.3)} rx={round(r * 0.2)} ry={round(r * 0.1)} fill="#fff" opacity="0.32" transform={`rotate(-30 ${round(x - r * 0.26)} ${round(y - r * 0.3)})`} />
    </g>
  );
}

function BowlOfBerries({ x, y, r }: { x: number; y: number; r: number }) {
  const s = r / 110;
  const place = (dx: number, dy: number) => [round(x + dx * s), round(y + dy * s)];
  const berries: [number, number, number][] = [[-48, -48, -25], [20, -60, 30], [58, -6, 80], [-66, 14, -60], [-8, 4, 10], [38, 50, 140], [-32, 60, 200]];
  const daisies: [number, number, number][] = [[-20, -74, 16], [46, -66, 15], [-76, -22, 14], [30, -22, 17], [78, 34, 15], [-52, 52, 15], [4, 72, 17], [-14, -24, 13], [62, 66, 12]];
  return (
    <g>
      <Shadow x={x + 10 * s} y={y + 14 * s} r={r} />
      <circle cx={x} cy={y} r={r} fill="url(#bowl)" stroke="#dca1a5" strokeWidth="1.5" />
      <circle cx={x} cy={y} r={round(r * 0.9)} fill="#f3d0ce" />
      {berries.map(([dx, dy, angle]) => {
        const [px, py] = place(dx, dy);
        return <Strawberry key={`${dx}${dy}`} x={px} y={py} size={round(31 * s)} angle={angle} />;
      })}
      {daisies.map(([dx, dy, size]) => {
        const [px, py] = place(dx, dy);
        return <Daisy key={`d${dx}${dy}`} x={px} y={py} r={round(size * s)} />;
      })}
    </g>
  );
}

function Glasses() {
  const glass = (x: number, y: number) => (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy="96" rx="44" ry="8" fill="#2c2a18" opacity="0.2" filter="url(#soft-shadow)" />
      <path d="M-40 -82L-30 88H30L40 -82Z" fill="#fff" opacity="0.58" stroke={outline} strokeWidth="1.5" />
      <path d="M-36 -24L-30 88H30L36 -24Z" fill="#f6c7c6" opacity="0.72" />
      <path d="M-13 -82L-10 88M13 -82L10 88" stroke="#fff" strokeWidth="2.5" opacity="0.7" />
    </g>
  );
  return (
    <g>
      {glass(150, 150)}
      {glass(252, 156)}
      <Strawberry x={252} y={54} size={22} angle={15} />
      <Daisy x={92} y={252} r={18} />
    </g>
  );
}

function FlutedPan() {
  return (
    <g>
      <Shadow x={209} y={162} r={116} />
      <circle cx="200" cy="150" r="116" fill="url(#tin)" stroke="#8f8a7e" strokeWidth="1.5" />
      {Array.from({ length: 14 }, (_, i) => {
        const [x1, y1] = polar(200, 150, 34, (i / 14) * 2 * Math.PI);
        const [x2, y2] = polar(200, 150, 110, (i / 14) * 2 * Math.PI);
        return <path key={i} d={`M${x1} ${y1}L${x2} ${y2}`} stroke="#8f8a7e" strokeWidth="2.5" opacity="0.72" />;
      })}
      <circle cx="200" cy="150" r="70" fill="none" stroke="#f4f1ea" strokeWidth="6" opacity="0.6" />
      <circle cx="200" cy="150" r="33" fill="#a29c8f" stroke="#8f8a7e" />
      <circle cx="200" cy="150" r="17" fill="#6c675c" />
      <Daisy x={330} y={250} r={20} />
    </g>
  );
}

function Picnic({ pattern }: { pattern: number }) {
  return (
    <g>
      <BowlOfBerries x={158} y={150} r={106} />
      <Cup x={318} y={84} r={32} pattern={pattern} />
      <g transform="rotate(10 318 222)">
        <rect x="270" y="176" width="96" height="88" rx="2" fill={china} stroke="#e5ddcf" />
        <path d="M284 196h68M284 212h68M284 228h46" stroke="#a6978a" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Teapot({ pattern }: { pattern: number }) {
  return (
    <g>
      <ellipse cx="204" cy="258" rx="108" ry="14" fill="#2c2a18" opacity="0.26" filter="url(#soft-shadow)" />
      <path d="M112 152C74 122 64 88 46 76L72 60C92 86 110 106 134 118Z" fill="url(#china-shade)" stroke={outline} strokeWidth="1.5" />
      <path d="M286 114c62 -6 64 90 -6 86" fill="none" stroke={gold} strokeWidth="10" strokeLinecap="round" />
      <ellipse cx="200" cy="162" rx="98" ry="90" fill="url(#china-shade)" stroke={outline} strokeWidth="1.5" />
      <path d="M142 82c20 -26 96 -26 116 0c-24 10 -92 10 -116 0Z" fill="#f8efe5" stroke={gold} strokeWidth="2" />
      <circle cx="200" cy="52" r="11" fill={gold} />
      <Leaf x={198} y={174} size={40} angle={200} />
      <Leaf x={204} y={174} size={38} angle={-30} />
      {pattern % 2 ? <Peony x={200} y={166} r={36} /> : <Daisy x={200} y={166} r={34} />}
      <Blossom x={140} y={192} r={13} />
      <Blossom x={262} y={136} r={12} fill={rose} />
      <path d="M120 216C160 250 240 250 280 216" fill="none" stroke={gold} strokeWidth="2" />
    </g>
  );
}

function Vase() {
  return (
    <g>
      <ellipse cx="202" cy="270" rx="58" ry="9" fill="#2c2a18" opacity="0.22" filter="url(#soft-shadow)" />
      <path d="M200 170C190 122 162 92 134 76M200 170C204 110 204 76 206 44M200 170C212 122 240 96 268 84" fill="none" stroke={leafDark} strokeWidth="3.5" />
      <Leaf x={186} y={120} size={38} angle={205} />
      <Leaf x={212} y={126} size={36} angle={-30} />
      <Daisy x={134} y={72} r={32} />
      <Daisy x={206} y={44} r={34} />
      <Daisy x={270} y={80} r={30} />
      <path d="M176 148H224L216 182C240 208 248 236 234 266H166C152 236 160 208 184 182Z" fill="#fff" opacity="0.62" stroke={outline} strokeWidth="1.5" />
    </g>
  );
}

function Tier() {
  const plate = (y: number, rx: number) => (
    <g>
      <ellipse cx="200" cy={y + 8} rx={rx * 0.96} ry={rx * 0.13} fill="#2c2a18" opacity="0.2" filter="url(#soft-shadow)" />
      <ellipse cx="200" cy={y} rx={rx} ry={rx * 0.15} fill="url(#china-shade)" stroke={gold} strokeWidth="2" />
    </g>
  );
  return (
    <g>
      <ellipse cx="200" cy="276" rx="60" ry="8" fill="#2c2a18" opacity="0.24" filter="url(#soft-shadow)" />
      <path d="M200 46V262M162 270H238" fill="none" stroke={gold} strokeWidth="6" strokeLinecap="round" />
      <circle cx="200" cy="38" r="9" fill={gold} />
      {plate(232, 128)}
      <Strawberry x={120} y={208} size={23} angle={-12} />
      <Strawberry x={172} y={204} size={25} angle={8} />
      <Strawberry x={228} y={206} size={24} angle={-6} />
      <Strawberry x={280} y={208} size={22} angle={14} />
      {plate(124, 86)}
      <Daisy x={148} y={106} r={18} />
      <Strawberry x={200} y={100} size={22} />
      <Daisy x={252} y={106} r={18} />
    </g>
  );
}

export function Photo({
  label,
  kind = "plate",
  caption = false,
}: {
  label: string;
  kind?: PhotoKind;
  caption?: boolean;
}) {
  const seed = hash(label);
  const background = backgrounds[seed % backgrounds.length];
  return (
    <div className="photo">
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Painting standing in for a photo of ${label}`}
      >
        <rect width="400" height="300" fill={`url(#${background})`} />
        <g filter="url(#soft-edge)">
          {kind === "plate" ? <Plate pattern={seed} /> : null}
          {kind === "cup" ? <Cup pattern={seed} /> : null}
          {kind === "glass" ? <Glasses /> : null}
          {kind === "pan" ? <FlutedPan /> : null}
          {kind === "kit" ? <Picnic pattern={seed} /> : null}
          {kind === "teapot" ? <Teapot pattern={seed} /> : null}
          {kind === "vase" ? <Vase /> : null}
          {kind === "tier" ? <Tier /> : null}
        </g>
        <rect width="400" height="300" fill="url(#sun)" />
      </svg>
      {caption ? <span className="photo-caption">Painted for now, real photographs soon</span> : null}
    </div>
  );
}

// Tea on the lawn: a bowl of strawberries and daisies beside an open book.
export function TableScene({ label }: { label: string }) {
  const lines = [
    "It is a truth universally",
    "acknowledged, that a person",
    "planning a very good date",
    "must be in want of a table.",
  ];
  return (
    <div className="photo scene">
      <svg
        viewBox="0 0 800 900"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Painting standing in for a photo of ${label}`}
      >
        <rect width="800" height="900" fill="url(#grass)" />
        <g filter="url(#soft-edge)">
          <BowlOfBerries x={420} y={330} r={240} />
          <Cup x={660} y={660} r={72} pattern={1} />
          <Daisy x={110} y={130} r={34} />
          <Daisy x={704} y={132} r={30} />
          <Daisy x={120} y={480} r={26} />
          <Daisy x={430} y={690} r={24} />
          <Strawberry x={500} y={760} size={40} angle={35} />
        </g>
        <g transform="rotate(-7 180 760)">
          <rect x="-30" y="618" width="440" height="330" fill="#2c2a18" opacity="0.28" filter="url(#soft-shadow)" />
          <rect x="-40" y="608" width="440" height="330" fill="#fffdf6" />
          <path d="M400 608V938" stroke="#d8cfbd" strokeWidth="5" />
          <text x="360" y="646" fontFamily="var(--font-body), Georgia, serif" fontSize="17" fill="#6a6256">333</text>
          {lines.map((line, index) => (
            <text key={line} x="18" y={682 + index * 38} fontFamily="var(--font-body), Georgia, serif" fontSize="27" fill="#37332b">
              {line}
            </text>
          ))}
        </g>
        <rect width="800" height="900" fill="url(#sun)" />
      </svg>
      <span className="photo-caption">Painted for now, real photographs soon</span>
    </div>
  );
}

// Watercolor flowers for the corners of a card or section.
export function Bouquet({ className }: { className?: string }) {
  return (
    <svg className={`bouquet ${className ?? ""}`} viewBox="0 0 320 300" aria-hidden="true" focusable="false">
      <g filter="url(#soft-edge)">
        <Leaf x={150} y={150} size={120} angle={-158} />
        <Leaf x={150} y={150} size={108} angle={-112} fill="#88a766" />
        <Leaf x={160} y={146} size={114} angle={-30} fill="#88a766" />
        <Leaf x={156} y={160} size={120} angle={32} />
        <Leaf x={148} y={160} size={106} angle={118} fill="#88a766" />
        <Leaf x={144} y={156} size={110} angle={162} />
        <Peony x={150} y={150} r={68} />
        <Peony x={232} y={108} r={42} />
        <Peony x={82} y={214} r={44} />
        <Daisy x={72} y={108} r={30} />
        <Daisy x={230} y={204} r={32} />
        <Blossom x={170} y={46} r={18} />
        <Blossom x={156} y={254} r={17} fill={rose} />
        <Strawberry x={282} y={166} size={24} angle={18} />
      </g>
    </svg>
  );
}

// A long vine of flowers and strawberries, used between sections.
export function Garland() {
  const leaves: [number, number, number][] = [
    [60, 42, -30], [130, 30, 200], [210, 40, 20], [300, 26, -24], [370, 44, 150], [470, 30, -20], [545, 38, 210], [630, 42, 20], [705, 26, 195], [790, 40, -24], [860, 30, 150], [950, 42, 24], [1030, 26, 200], [1110, 40, -24], [1170, 30, 190],
  ];
  return (
    <svg className="garland" viewBox="0 0 1200 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <g filter="url(#soft-edge)">
        <path d="M0 42C120 12 220 72 340 42S560 12 680 42S900 72 1020 42S1140 18 1200 38" fill="none" stroke={leafDark} strokeWidth="2.5" />
        {leaves.map(([x, y, angle]) => (
          <Leaf key={x} x={x} y={y} size={36} angle={angle} fill={x % 3 ? leaf : "#88a766"} />
        ))}
        <Daisy x={100} y={34} r={20} />
        <Peony x={258} y={52} r={24} />
        <Strawberry x={402} y={40} size={18} angle={15} />
        <Daisy x={520} y={32} r={18} />
        <Blossom x={592} y={42} r={15} />
        <Peony x={742} y={38} r={26} />
        <Daisy x={826} y={54} r={19} />
        <Strawberry x={910} y={42} size={18} angle={-14} />
        <Peony x={1064} y={40} r={23} />
        <Daisy x={1152} y={36} r={18} />
      </g>
    </svg>
  );
}
