import React, { useState } from 'react';

export const OFFICIAL_RSHL_LOGO_SRC = '/assets/aistudio/logo_rshl_cropped.png';
export const OFFICIAL_RSHL_LOGO_SOLID_SRC = '/assets/aistudio/logo_rshl_solid.png';
export const OFFICIAL_RSHL_ORIGINAL_SRC = '/assets/aistudio/LOGO_WARNA_VID_LANDSCAPE_f7d527db.png';

interface RshlLogoProps {
  className?: string;
  idPrefix?: string;
  alt?: string;
  variant?: 'transparent' | 'solid' | 'original';
}

export const RshlLogo: React.FC<RshlLogoProps> = ({
  className = 'w-[240px] h-auto',
  alt = 'RS Happy Land Medical Centre',
  variant = 'transparent'
}) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const sources = [
    variant === 'solid' ? OFFICIAL_RSHL_LOGO_SOLID_SRC : OFFICIAL_RSHL_LOGO_SRC,
    OFFICIAL_RSHL_LOGO_SOLID_SRC,
    OFFICIAL_RSHL_ORIGINAL_SRC
  ];

  const currentSrc = sources[srcIndex] || OFFICIAL_RSHL_ORIGINAL_SRC;

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        if (srcIndex < sources.length - 1) {
          setSrcIndex((prev) => prev + 1);
        }
      }}
      className={`${className} bg-transparent object-contain select-none`}
      loading="eager"
      decoding="async"
    />
  );
};
