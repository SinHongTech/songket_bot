import iconLogo from "../assets/Logo.svg";

export default function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <img
      src={iconLogo}
      width={size}
      height={size}
      alt="Yuju Security Bot logo"
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}
