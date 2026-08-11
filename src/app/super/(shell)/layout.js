import Shell from "../_components/Shell";

// Every console page renders inside the sidebar + header chrome.
export default function ShellLayout({ children }) {
  return <Shell>{children}</Shell>;
}
