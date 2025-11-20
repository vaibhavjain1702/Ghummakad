
import React from 'react';

const IconWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 border-2 border-slate-600 ${className}`}>
    {children}
  </div>
);

const LargeIconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-4">
    {children}
  </div>
);


export const MuseumIcon: React.FC = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 18v-9a2 2 0 012-2h10a2 2 0 012 2v9M4 21h16M12 3l4 4H8l4-4z" />
    </svg>
  </IconWrapper>
);

export const FoodIcon: React.FC = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.5a2.5 2.5 0 01-2.5 2.5h-10a2.5 2.5 0 01-2.5-2.5V8.5a2.5 2.5 0 012.5-2.5h10a2.5 2.5 0 012.5 2.5v7zM6 8.5V6a2 2 0 012-2h8a2 2 0 012 2v2.5" />
    </svg>
  </IconWrapper>
);

export const OutdoorIcon: React.FC = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.8 11.25l4.2-4.2m0 0l4.2 4.2M12 7.05V18" />
    </svg>
  </IconWrapper>
);

export const HistoryIcon: React.FC = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </IconWrapper>
);

export const ArtIcon: React.FC = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
  </IconWrapper>
);

export const ShoppingIcon: React.FC = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  </IconWrapper>
);

export const NightlifeIcon: React.FC = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-fuchsia-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  </IconWrapper>
);

export const TechnologyIcon: React.FC = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  </IconWrapper>
);

export const DefaultIcon: React.FC = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </IconWrapper>
);

export const BotIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8" />
    <rect x="4" y="12" width="16" height="8" rx="2" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M12 18v2" />
    <path d="M12 2v2" />
  </svg>
);

export const CalendarIcon: React.FC = () => (
  <LargeIconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  </LargeIconWrapper>
);

export const MapPinIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const WeatherIcon: React.FC<{ forecast: string }> = ({ forecast }) => {
    const f = forecast.toLowerCase();
    let icon;

    if (f.includes('sun') || f.includes('clear')) {
        icon = ( // Sunny
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        );
    } else if (f.includes('rain') || f.includes('shower') || f.includes('drizzle')) {
        icon = ( // Rainy
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15zm0 0l-1 .5m1-.5l1 .5m9-3l1 .5m-1-.5l-1 .5" />
            </svg>
        );
    } else { // Default: cloudy
        icon = (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
        );
    }
    return <div className="mr-2 flex-shrink-0">{icon}</div>;
};

export const TransportIcon: React.FC<{ mode: string }> = ({ mode }) => {
    const m = mode.toLowerCase();
    let iconPath;

    if (m.includes('walk')) {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 3.75a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75h-.01a.75.75 0 01-.75-.75V3.75zm0 0v1.5M10.125 6.375v11.25m-3.375-6.375v6.375m-3.375-3.375v3.375m-3.375 0v-1.125a1.125 1.125 0 011.125-1.125h1.5a1.125 1.125 0 011.125 1.125v1.125m-3.375 0h3.375m0 0v-1.125a1.125 1.125 0 00-1.125-1.125h-1.5a1.125 1.125 0 00-1.125 1.125v1.125m6.75-3.375v1.125a1.125 1.125 0 01-1.125 1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-1.125m3.375 0h-3.375" />;
    } else if (m.includes('metro') || m.includes('train') || m.includes('subway')) {
        iconPath = <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5h12.75m0 0v-4.25a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25v4.25" />;
    } else if (m.includes('bus')) {
    iconPath = (
        <>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 6.375a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0v-5.25a.75.75 0 01.75-.75zM9 6.375a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0v-5.25A.75.75 0 019 6.375z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 7.5h16.5c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H3.75A1.125 1.125 0 012.625 18.375V8.625c0-.621.504-1.125 1.125-1.125zM12 18.75a.375.375 0 100-.75.375.375 0 000 .75z"
            />
        </>
    );
} else { // car/taxi
    iconPath = (
        <>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V9.75c0-.621.504-1.125 1.125-1.125h14.25c.621 0 1.125.504 1.125 1.125v7.875c0 .621-.504 1.125-1.125 1.125H12.875"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.375 9.75h17.25M13.5 9.75l-4.5-4.5-4.5 4.5"
            />
        </>
    );
}

    return (
        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center mr-3 flex-shrink-0 border-2 border-slate-500">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                 {iconPath}
            </svg>
        </div>
    );
};

export const FlightIcon: React.FC = () => (
    <IconWrapper className="bg-sky-900/50 border-sky-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
    </IconWrapper>
);

export const HotelIcon: React.FC = () => (
    <IconWrapper className="bg-rose-900/50 border-rose-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
    </IconWrapper>
);

export const StarIcon: React.FC<{ rating: number }> = ({ rating }) => (
    <span className="inline-flex items-center">
        <span className="mr-1">{rating.toFixed(1)}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-300" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
    </span>
);
