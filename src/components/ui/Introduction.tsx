import { motion } from "framer-motion";

export default function CinematicDisplayNameUI() {

  const name = "CODORIUS, O TITÃ";

  // controla o tamanho dinamicamente
  const baseSize = 120;

  const fontSize =
    name.length > 18 ? baseSize * 0.65 :
    name.length > 14 ? baseSize * 0.8 :
    name.length > 10 ? baseSize * 0.9 :
    baseSize;

  const estimatedLength = name.length * fontSize * 0.6;

  return (

    <div className="
      fixed inset-0
      flex items-center justify-center
      bg-black
      z-[9999]
    ">

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

          fill="#af3535"
          fillOpacity={0}

          stroke="#830f0f"
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
              drop-shadow(0 0 6px #ffffff)
              drop-shadow(0 0 12px rgb(236, 17, 17))
              drop-shadow(0 0 20px rgb(247, 30, 23))
            `
          }}

        >
          {name}

        </motion.text>

      </svg>

    </div>

  );

}