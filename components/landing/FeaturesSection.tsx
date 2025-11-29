// ============================================================================
// app/(store)/components/FeaturesSection.tsx
// Dashboard-Style Features with Cards
// ============================================================================

import { Truck, Shield, Clock, Package as PackageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'Free delivery on orders over $50',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    icon: Shield,
    title: 'Secure Payment',
    description: '100% secure payment guaranteed',
    color: 'from-blue-500 to-purple-500'
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'Dedicated customer support',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: PackageIcon,
    title: 'Easy Returns',
    description: '30-day return policy',
    color: 'from-pink-500 to-red-500'
  }
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export const FeaturesSection: React.FC = () => {
  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const FeatureCard: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}> = ({ icon: Icon, title, description, color }) => {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-slate-200 hover:border-cyan-300 hover:shadow-xl transition-all duration-300 h-full">
        <CardContent className="p-6 text-center">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center shadow-lg`}
          >
            <Icon className="w-8 h-8 text-white" />
          </motion.div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-600 text-sm">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};