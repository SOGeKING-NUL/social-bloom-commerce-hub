import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button"; // Adjust based on your component library
import { Users, ShoppingBag, ShareNetwork } from "@phosphor-icons/react";
import { motion } from "framer-motion";

// Define container variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

export default function Hero() {
  return (
    <motion.main
      className="relative overflow-hidden bg-gradient-to-b from-white via-pink-50 to-white text-gray-800"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-[80vw] h-[80vw] max-w-[750px] max-h-[750px] bg-pink-400 blur-[200px] opacity-20 animate-pulse-slow" />
      </div>
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 relative z-10">
        <motion.div
          className="grid md:grid-cols-2 gap-12 items-center"
          variants={containerVariants}
        >
          <motion.div className="text-center md:text-left">
            <motion.h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-gray-900">
              Shop, Share, and <span className="text-pink-500">Connect</span>
            </motion.h1>
            <motion.p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto md:mx-0">
              The social e-commerce platform where communities discover, share,
              and shop their favorite products together.
            </motion.p>
            <motion.div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button
                size="lg"
                className="bg-pink-500 hover:bg-pink-600 text-white text-lg px-8 py-6 rounded-full transition-transform hover:scale-105 shadow-lg hover:shadow-pink-500/40"
              >
                <Link to="/products" className="flex items-center">
                  <ShoppingBag size={22} className="mr-2" />
                  Start Shopping
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white text-lg px-8 py-6 rounded-full transition-all hover:scale-105 bg-white/50 backdrop-blur-sm"
              >
                <Link to="/groups" className="flex items-center">
                  <Users size={22} className="mr-2" />
                  Create Group
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div className="relative w-full max-w-md mx-auto">
            <div className="relative bg-white/60 rounded-[48px] p-4 shadow-2xl shadow-gray-500/20 border border-gray-200">
              <img
                src="./"
                width={600}
                height={550}
                alt="please add some images utsav and adjust height and width accordingly"
                className="rounded-[32px]"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={containerVariants}
        >
          <FeatureCard
            icon={<ShareNetwork size={32} className="text-pink-500" />}
            title="Social Shopping"
            description="Share your favorite finds with friends and discover new products through your social network."
          />
          <FeatureCard
            icon={<Users size={32} className="text-pink-500" />}
            title="Private Groups"
            description="Create exclusive shopping groups for specific brands and invite your closest friends and family."
          />
          <FeatureCard
            icon={<ShoppingBag size={32} className="text-pink-500" />}
            title="Easy Ordering"
            description="Order products directly from your groups with quantity selection and seamless checkout."
          />
        </motion.div>
      </section>
    </motion.main>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <motion.div className="bg-gradient-to-t from-pink-100/50 to-white/30 p-8 rounded-2xl border border-gray-200 transition-all duration-300 hover:border-gray-300 hover:shadow-xl hover:-translate-y-2 backdrop-blur-xl">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}
