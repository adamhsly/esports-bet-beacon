
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, Menu, X, Star, Trophy, Calendar, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const navItems = [
    { name: 'Esports Betting Sites', href: '/betting-sites', icon: Trophy },
    { name: 'Game Guides', href: '/guides', icon: Flag },
    { name: 'Bonuses', href: '/bonuses', icon: Star },
    { name: 'Upcoming Matches', href: '/matches', icon: Calendar },
  ];

  return (
    <nav className="relative z-50 bg-theme-gray-dark/80 backdrop-blur-lg border-b border-theme-gray-medium">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-xl font-bold font-gaming tracking-wider text-white">
              <span className="highlight-gradient">ESPORTS</span>
              <span className="text-theme-green">BEACON</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-gray-300 hover:text-theme-purple flex items-center gap-1.5 text-sm font-medium"
              >
                <item.icon size={16} />
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right section (Search & Login) */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-gray-300">
              <Search size={18} />
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button variant="ghost" onClick={toggleMobileMenu} size="icon">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          "md:hidden absolute w-full bg-theme-gray-medium border-b border-theme-gray-light",
          mobileMenuOpen ? "block" : "hidden"
        )}
      >
        <div className="px-4 py-3 space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:bg-theme-gray-dark hover:text-theme-purple"
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon size={16} />
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
