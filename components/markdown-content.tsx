import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-semibold text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 border-t border-border pt-8 text-xl font-semibold text-foreground first:mt-0 first:border-0 first:pt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-lg font-semibold text-foreground">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-6 text-foreground">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:text-primary/80"
      {...(href?.startsWith("http")
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  hr: () => <hr className="my-8 border-border" />,
  table: ({ children }) => (
    <div className="my-4">
      <Table>{children}</Table>
    </div>
  ),
  thead: ({ children }) => <TableHeader>{children}</TableHeader>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => (
    <TableHead className="px-4 py-2.5">{children}</TableHead>
  ),
  td: ({ children }) => (
    <TableCell className="px-4 py-2.5">{children}</TableCell>
  ),
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg border border-border bg-muted px-4 py-3 font-mono text-xs leading-6 text-foreground">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
        {children}
      </code>
    );
  },
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <article className="space-y-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
