import { motion } from "framer-motion";

interface CDNProps {
  onEnd: (b: boolean) => void;
}

export default function CinematicDisplayNameUI({ onEnd }: CDNProps) {

  const name = "ATLAS BLACKOUT";

  const baseSize = 120;

  const fontSize =
    name.length > 18 ? baseSize * 0.65 :
    name.length > 14 ? baseSize * 0.8 :
    name.length > 10 ? baseSize * 0.9 :
    baseSize;

  const estimatedLength = name.length * fontSize * 0.6;

  return (

    <motion.div
      className="
        fixed inset-0
        flex items-center justify-center
        bg-black
        z-[9999]
      "

      initial={{ opacity: 1 }}

      animate={{ opacity: 0 }}

      transition={{
        delay: 15,        // tempo total antes do fade
        duration: 2.5,    // duração do fade
        ease: "easeInOut"
      }}

      onAnimationComplete={() => {
        onEnd(true);
      }}
    >

      <svg
        viewBox={`0 0 ${Math.max(1200, estimatedLength)} 200`}
        className="w-[80vw] max-w-[1200px]"
        preserveAspectRatio="xMidYMid meet"
      >

        <motion.text

          x="50%"
          y="50%"

          dominantBaseline="middle"
          textAnchor="middle"

          fontSize={fontSize}

          fontFamily="Cinzel, serif"
          fontWeight="bold"

          fill="#000000"
          fillOpacity={0}

          stroke="#971e91"
          strokeWidth="2"

          initial={{
            strokeDasharray: 4000,
            strokeDashoffset: 4000,
            fillOpacity: 0
          }}

          animate={{
            strokeDashoffset: 0,
            fillOpacity: 1
          }}

          transition={{
            strokeDashoffset: {
              duration: 25,
              ease: "easeInOut"
            },

            fillOpacity: {
              delay: 7,
              duration: 1.5
            }
          }}

          style={{
            letterSpacing: "0.05em",

            filter: `
              drop-shadow(0 0 6px #5e3f7c)
              drop-shadow(0 0 12px rgb(214, 69, 228))
              drop-shadow(0 0 20px rgb(219, 54, 197))
            `
          }}

        >
          {name}

        </motion.text>

      </svg>

    </motion.div>

  );

}