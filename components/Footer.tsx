
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white mt-auto">
      <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} โรงเรียนสตรีพัทลุง | Satri Phatthalung School
      </div>
    </footer>
  );
};

export default Footer;
