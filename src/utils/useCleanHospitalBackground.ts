import { useState } from 'react';

/**
 * Official pristine RS Happy Land exterior photograph uploaded by user.
 * Directly loaded with crisp resolution, without artificial canvas blur or patch heuristics.
 */
export const HOSPITAL_RAW_BG_SRC = '/assets/aistudio/2021-10-18_7a7fa8a8.webp';

export function useCleanHospitalBackground(): {
  bgSrc: string;
  isProcessed: boolean;
  hasError: boolean;
  onImageError: () => void;
} {
  const [hasError, setHasError] = useState<boolean>(false);

  return {
    bgSrc: HOSPITAL_RAW_BG_SRC,
    isProcessed: true,
    hasError,
    onImageError: () => setHasError(true)
  };
}
