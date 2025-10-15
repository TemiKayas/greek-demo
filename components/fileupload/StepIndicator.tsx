'use client';

import Image from 'next/image';

/**
 * step indicator showing current step number and title
 * displays a green circle with white number and brown text
 *
 * props:
 * - step: the step number to display
 * - title: the title text to display
 */

interface StepIndicatorProps {
  step: number;
  title: string;
}

export default function StepIndicator({ step, title }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      {/* green circle with step number */}
      <div className="relative w-[60px] h-[60px] flex items-center justify-center">
        <Image
          src="/assets/fileupload/step-circle.svg"
          alt=""
          width={60}
          height={60}
          className="absolute"
        />
        {/* white step number overlaid on circle */}
        <span className="text-3xl font-bold text-[#fffdfa] relative z-10">{step}</span>
      </div>

      {/* brown title text */}
      <h1 className="text-3xl font-bold text-[#473025]">{title}</h1>
    </div>
  );
}
