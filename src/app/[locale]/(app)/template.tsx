/**
 * A template (unlike a layout) is created anew on every navigation, so the page between the
 * persistent header and dock plays a short enter animation each time a tab is opened.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
