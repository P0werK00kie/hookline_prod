const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const WriterAvatar = ({ name, imageUrl, size = 56 }: { name: string; imageUrl?: string; size?: number }) =>
  imageUrl ? (
    <img
      src={imageUrl}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      aria-hidden
      className="rounded-full bg-primary-500/20 text-primary-500 flex-center base-semibold shrink-0"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </div>
  );

export default WriterAvatar;
