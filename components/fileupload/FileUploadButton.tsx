'use client';

import Image from 'next/image';

/**
 * green "choose file" button with file icon and plus indicator
 * used inside the file upload drop zone
 *
 * props:
 * - onClick: callback when button is clicked
 * - disabled: whether the button is disabled
 */

interface FileUploadButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function FileUploadButton({ onClick, disabled = false }: FileUploadButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // stop propagation to prevent drop zone click handler
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`
        relative bg-[#96b902] hover:bg-[#7a9700]
        text-[#fffdfa] font-bold text-lg
        rounded-xl px-5 py-3
        flex items-center justify-center gap-2
        transition-all duration-300
        shadow-md hover:shadow-lg
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
      `}
    >
      {/* file icon with plus indicator overlay */}
      <div className="relative w-8 h-8 flex items-center justify-center">
        <Image
          src="/assets/fileupload/file-icon.svg"
          alt="File"
          width={32}
          height={32}
          className="filter brightness-0 invert"
        />
        {/* plus icon overlay in bottom right corner */}
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5">
          <div className="relative w-full h-full">
            <Image
              src="/assets/fileupload/plus-circle.svg"
              alt=""
              width={20}
              height={20}
              className="absolute inset-0"
            />
            <Image
              src="/assets/fileupload/plus-icon.svg"
              alt=""
              width={12}
              height={12}
              className="absolute inset-0 m-auto"
            />
          </div>
        </div>
      </div>

      {/* button text */}
      <span>Choose File</span>
    </button>
  );
}
