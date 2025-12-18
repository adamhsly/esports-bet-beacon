import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-theme-gray-dark border-t border-theme-gray-medium mt-16 py-10">
      <div className="container mx-auto px-4">
        {/* Centre the grid content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-center justify-items-center">
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-gaming tracking-wider">
              <span className="text-theme-purple">FRAGS</span> <span className="text-yellow-400">&</span>{" "}
              <span className="text-white">FORTUNES</span>
            </h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
              Frags & Fortunes is your free-to-play esports fantasy pick'ems platform. Build your ultimate roster from professional and amateur teams across Counter-Strike 2, Valorant, Dota 2, and League of Legends. Track live match scores in real-time, compete on global and private leaderboards, and win Steam vouchers and exclusive rewards. Join daily, weekly, and monthly fantasy esports contests featuring the world's top esports organizations and rising amateur talent.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Information</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/blog"
                  className="text-gray-400 hover:text-theme-purple transition-colors duration-200 text-sm cursor-pointer"
                >
                  Blog
                </Link>
              </li>
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
              <li>
                <Link
                  to="/legal/cookies"
                  className="text-gray-400 hover:text-theme-purple transition-colors duration-200 text-sm cursor-pointer"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Community</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://discord.gg/SbcRthSER"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#5865F2] transition-colors duration-200 text-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Join Discord
                </a>
              </li>
              <li>
                <Link
                  to="/affiliate-program"
                  className="text-gray-400 hover:text-theme-purple transition-colors duration-200 text-sm cursor-pointer"
                >
                  Partner Program
                </Link>
              </li>
              <li>
                <Link
                  to="/affiliate-dashboard"
                  className="text-gray-400 hover:text-theme-purple transition-colors duration-200 text-sm cursor-pointer"
                >
                  Partner Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:theteam@fragsandfortunes.com"
                  className="text-gray-400 hover:text-theme-purple transition-colors duration-200 text-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="border-t border-theme-gray-medium mt-8 pt-6 text-center">
          <p className="text-gray-500 text-xs max-w-2xl mx-auto mb-4">
            Void where prohibited. Users are responsible for ensuring legal compliance in their region. Play responsibly. Fantasy contests should remain fun and skill-based.
          </p>
          <p className="text-gray-400 text-sm">© {currentYear} Frags and Fortunes. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
