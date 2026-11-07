/** Shown instantly while a screen loads, so a tap always answers at once instead of freezing on the old page. */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 md:px-10 md:pt-8" aria-busy="true">
      <div className="skeleton h-12 rounded-full md:h-14" />
      <div className="skeleton mt-5 h-24 rounded-2xl md:h-48" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
