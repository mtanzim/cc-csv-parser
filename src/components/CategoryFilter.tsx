import { UNCATEGORIZED } from "@/lib/schemas";

type Props = {
  categories: string[];
  categoryValueFilters: string[];
  setCategoryValueFilters: (v: string[]) => void;
};

export function CategoryFilter({
  categories,
  categoryValueFilters,
  setCategoryValueFilters,
}: Props) {
  return (
    <div className="mt-4 mb-4">
      {categories.concat(UNCATEGORIZED).map((c) => (
        <button
          key={c}
          onClick={() => {
            if (categoryValueFilters.find((cp) => c === cp)) {
              return setCategoryValueFilters(
                categoryValueFilters.filter((cp) => c !== cp),
              );
            }
            return setCategoryValueFilters(categoryValueFilters.concat(c));
          }}
          className={`mt-2 mb-2 mr-2 badge badge-accent cursor-pointer ${
            categoryValueFilters.findIndex((cp) => c === cp) > -1
              ? ""
              : "badge-outline"
          }`}
        >
          {c}
        </button>
      ))}
      <button
        onClick={() => setCategoryValueFilters([])}
        className="mt-2 mb-2 mr-2 badge badge-error cursor-pointer"
      >
        Clear
      </button>
      <button
        onClick={() =>
          setCategoryValueFilters(categories.concat(UNCATEGORIZED))
        }
        className="mt-2 mb-2 badge badge-primary cursor-pointer"
      >
        Select all
      </button>
    </div>
  );
}
