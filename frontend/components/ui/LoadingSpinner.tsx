export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Spinning book icon representation */}
        <div className={`${sizeClasses[size]} relative`}>
          <div className="absolute inset-0 border-4 border-indigo-200 rounded-lg"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-indigo-600 rounded-lg animate-spin"></div>
        </div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} bg-indigo-600 rounded-full animate-pulse`}></div>
      </div>
    </div>
  );
}

