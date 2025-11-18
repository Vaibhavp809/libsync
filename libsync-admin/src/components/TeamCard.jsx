import React from 'react';
import './TeamCard.css';

/**
 * TeamCard Component
 * Displays a team member card with photo, name, role, and optional social links
 * 
 * Photo handling:
 * - If photoUrl is provided, it will display the photo
 * - Otherwise, shows a circular placeholder with initials
 * - To add a photo: Replace the placeholder src in Home.jsx with the actual photo URL
 *   Example: photoUrl="/images/team/vaibhav-parab.jpg" or photoUrl="https://example.com/photo.jpg"
 */
export default function TeamCard({ name, role, photoUrl, initials }) {
  return (
    <div className="team-card">
      <div className="team-card-avatar">
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt={`${name} — ${role}`}
            className="team-card-photo"
          />
        ) : (
          <div className="team-card-placeholder">
            {initials}
          </div>
        )}
      </div>
      <h3 className="team-card-name">{name}</h3>
      <p className="team-card-role">{role}</p>
    </div>
  );
}

