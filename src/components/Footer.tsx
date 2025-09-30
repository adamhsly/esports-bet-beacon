import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-theme-gray-dark border-t border-theme-gray-medium mt-16 py-10">
      <div className="container mx-auto px-4">
        {/* Centre the grid content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-center justify-items-center">
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-gaming tracking-wider">
              <span className="text-theme-purple">Frags</span>{' '}
              <span className="text-yellow-400">&</span>{' '}
              <span className="text-white">Fortunes</span>
            </h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              The premier destination for esports fantasy leagues and scores where both amateur and pro teams wage battle.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Information</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/legal/privacy"
                  className="text-gray-400 hover:text-theme-purple transition-colors duration-200 text-sm cursor-pointer"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/terms"
                  className="text-gray-400 hover:text-theme-purple transition-colors duration-200 text-sm cursor-pointer"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-theme-gray-medium mt-8 pt-8 flex flex-col md:flex-row justify-center items-center">
          <p className="text-gray-400 text-sm text-center">
            © {currentYear} Frags and Fortunes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
