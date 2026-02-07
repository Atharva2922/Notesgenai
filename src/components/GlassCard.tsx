import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hoverEffect = true }) => {
    return (
        <div
            className={`
        bg-white/5 backdrop-blur-md 
        border border-white/10 
        rounded-3xl p-6 
        transition-all duration-300
        ${hoverEffect ? 'hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
};

export default GlassCard;
