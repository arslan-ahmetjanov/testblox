/**
 * TestBlox logo: four squares with letters t, e, s, t.
 */
export default function TestbloxLogo({ size = 32, color = 'currentColor', sx = {} }) {
  const pad = size * 0.1;
  const box = (size - pad * 3) / 2;
  const fontSize = box * 0.6;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      sx={{ display: 'block', ...sx }}
      aria-hidden
    >
      <rect x={0} y={0} width={box} height={box} rx={2} stroke={color} strokeWidth={1.5} fill="none" />
      <text x={box / 2} y={box / 2 + fontSize / 3} textAnchor="middle" fill={color} fontSize={fontSize} fontWeight={600} fontFamily="inherit">t</text>
      <rect x={box + pad} y={0} width={box} height={box} rx={2} stroke={color} strokeWidth={1.5} fill="none" />
      <text x={box + pad + box / 2} y={box / 2 + fontSize / 3} textAnchor="middle" fill={color} fontSize={fontSize} fontWeight={600} fontFamily="inherit">e</text>
      <rect x={0} y={box + pad} width={box} height={box} rx={2} stroke={color} strokeWidth={1.5} fill="none" />
      <text x={box / 2} y={box + pad + box / 2 + fontSize / 3} textAnchor="middle" fill={color} fontSize={fontSize} fontWeight={600} fontFamily="inherit">s</text>
      <rect x={box + pad} y={box + pad} width={box} height={box} rx={2} stroke={color} strokeWidth={1.5} fill="none" />
      <text x={box + pad + box / 2} y={box + pad + box / 2 + fontSize / 3} textAnchor="middle" fill={color} fontSize={fontSize} fontWeight={600} fontFamily="inherit">t</text>
    </svg>
  );
}
