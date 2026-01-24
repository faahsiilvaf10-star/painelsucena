import authBgImage from "@/assets/auth-bg-security.png";

export function AuthBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${authBgImage})`
        }}
      />

      {/* Dark overlay for better text readability */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to right,
            rgba(0, 0, 0, 0.7) 0%,
            rgba(0, 0, 0, 0.4) 50%,
            rgba(0, 0, 0, 0.3) 100%
          )`
        }}
      />

      {/* Subtle vignette for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 30%,
            rgba(0, 0, 0, 0.3) 100%
          )`
        }}
      />
    </div>
  );
}
