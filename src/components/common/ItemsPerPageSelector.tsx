'use client';

interface ItemsPerPageSelectorProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
}

export default function ItemsPerPageSelector({
  value,
  onChange,
  options = [10, 20, 30, 50]
}: ItemsPerPageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="items-per-page" className="text-sm text-gray-700">
        Show
      </label>
      <select
        id="items-per-page"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="min-w-[5rem] px-3 py-1.5 text-sm text-gray-900 font-normal border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer appearance-none pr-8 bg-no-repeat bg-[length:16px_16px] bg-[position:right_0.5rem_center]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        }}
      >
        {options.map((option) => (
          <option key={option} value={option} className="text-gray-900 py-1">
            {String(option)}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-700">items</span>
    </div>
  );
}