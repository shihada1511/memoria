import React from 'react';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="footer-brand">
      <span className="footer-logo">M</span>
      <div>
        <span className="footer-team">Memoria — Team Memoria</span>
        <span className="footer-slogan">Study smarter, one flashcard at a time.</span>
      </div>
    </div>
    <span className="footer-year">&copy; {new Date().getFullYear()} Memoria. All rights reserved.</span>
  </footer>
);

export default Footer;
