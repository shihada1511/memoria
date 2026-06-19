import React from 'react';
import './Card.css';

const Card = ({ icon, accent = 'blue', title, subtitle, description, footer }) => (
  <div className={`memoria-card memoria-card-${accent}`}>
    {icon && <span className="memoria-card-icon">{icon}</span>}
    <h3 className="memoria-card-title">{title}</h3>
    {subtitle && <p className="memoria-card-subtitle">{subtitle}</p>}
    {description && <p className="memoria-card-description">{description}</p>}
    {footer && <div className="memoria-card-footer">{footer}</div>}
  </div>
);

export default Card;
