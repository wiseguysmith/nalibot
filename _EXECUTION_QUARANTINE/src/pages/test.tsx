import React from 'react';

export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 AI Trading Bot - Test Page</h1>
      <p>If you can see this, Next.js is working correctly!</p>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>System Status:</h3>
        <ul>
          <li>✅ Next.js: Working</li>
          <li>✅ React: Working</li>
          <li>✅ TypeScript: Working</li>
        </ul>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
          ← Go back to main dashboard
        </a>
      </div>
    </div>
  );
} 