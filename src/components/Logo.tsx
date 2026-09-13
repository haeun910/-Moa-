export default function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="110" fill="#86A03F" />
      <path
        d="M256 118 C 336 158, 372 244, 334 322 C 296 394, 216 394, 178 322 C 140 244, 176 158, 256 118 Z"
        fill="#FAFCF3"
      />
      <path
        d="M256 150 C 236 222, 236 302, 268 372"
        stroke="#86A03F"
        strokeWidth="15"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
