import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';

const MarkdownRenderer = ({ 
  children, 
  size = 'default', 
  className = '',
  ...props 
}) => {
  // Component configurations based on size
  const sizeConfigs = {
    default: {
      h1: 'text-2xl font-bold mb-4 mt-6',
      h2: 'text-xl font-semibold mb-3 mt-5',
      h3: 'text-lg font-medium mb-2 mt-4',
      h4: 'text-base font-medium mb-2 mt-3',
      h5: 'text-sm font-medium mb-1 mt-2',
      h6: 'text-sm font-medium mb-1 mt-2',
      p: 'mb-3 leading-relaxed',
      ul: 'list-disc list-inside mb-3 pl-4 space-y-1 [&_ul]:list-[circle] [&_ul_ul]:list-[square]',
      ol: 'list-decimal list-inside mb-3 pl-4 space-y-1',
      li: 'leading-relaxed',
      blockquote: 'border-l-4 border-gray-300 pl-4 italic my-4',
      codeInline: 'bg-gray-100 px-1 py-0.5 rounded text-sm font-mono',
      codeBlock: 'block bg-gray-100 p-3 rounded font-mono text-sm overflow-x-auto',
      pre: 'bg-gray-100 p-3 rounded mb-3 overflow-x-auto',
      a: 'text-blue-600 hover:text-blue-800 underline',
      strong: 'font-semibold',
      em: 'italic',
      hr: 'border-gray-300 my-4',
      table: 'min-w-full border-collapse border border-gray-300 my-4',
      thead: 'bg-gray-50',
      tbody: '',
      tr: 'border-b border-gray-200',
      th: 'border border-gray-300 px-4 py-2 text-left font-semibold bg-gray-50',
      td: 'border border-gray-300 px-4 py-2',
    },
    small: {
      h1: 'text-lg font-bold mb-3 mt-4',
      h2: 'text-base font-semibold mb-2 mt-3',
      h3: 'text-sm font-medium mb-2 mt-3',
      h4: 'text-sm font-medium mb-1 mt-2',
      h5: 'text-sm font-medium mb-1 mt-2',
      h6: 'text-sm font-medium mb-1 mt-2',
      p: 'mb-2 leading-relaxed text-sm',
      ul: 'list-disc list-inside mb-2 pl-3 space-y-0.5 text-sm [&_ul]:list-[circle] [&_ul_ul]:list-[square]',
      ol: 'list-decimal list-inside mb-2 pl-3 space-y-0.5 text-sm',
      li: 'leading-relaxed text-sm',
      blockquote: 'border-l-2 border-gray-300 pl-3 italic my-2 text-sm',
      codeInline: 'bg-gray-200 px-1 py-0.5 rounded text-xs font-mono',
      codeBlock: 'block bg-gray-200 p-2 rounded font-mono text-xs overflow-x-auto',
      pre: 'bg-gray-200 p-2 rounded mb-2 overflow-x-auto text-xs',
      a: 'text-blue-600 hover:text-blue-800 underline text-sm',
      strong: 'font-semibold',
      em: 'italic',
      hr: 'border-gray-300 my-2',
      table: 'min-w-full border-collapse border border-gray-300 my-2 text-sm',
      thead: 'bg-gray-100',
      tbody: '',
      tr: 'border-b border-gray-200',
      th: 'border border-gray-300 px-2 py-1 text-left font-semibold bg-gray-100 text-xs',
      td: 'border border-gray-300 px-2 py-1 text-xs',
    }
  };

  const config = sizeConfigs[size] || sizeConfigs.default;

  const components = {
    h1: ({node, ...props}) => <h1 className={config.h1} {...props} />,
    h2: ({node, ...props}) => <h2 className={config.h2} {...props} />,
    h3: ({node, ...props}) => <h3 className={config.h3} {...props} />,
    h4: ({node, ...props}) => <h4 className={config.h4} {...props} />,
    h5: ({node, ...props}) => <h5 className={config.h5} {...props} />,
    h6: ({node, ...props}) => <h6 className={config.h6} {...props} />,
    p: ({node, ...props}) => <p className={config.p} {...props} />,
    ul: ({node, ...props}) => <ul className={config.ul} {...props} />,
    ol: ({node, ...props}) => <ol className={config.ol} {...props} />,
    li: ({node, ...props}) => <li className={config.li} {...props} />,
    blockquote: ({node, ...props}) => <blockquote className={config.blockquote} {...props} />,
    code: ({node, inline, ...props}) => 
      inline 
        ? <code className={config.codeInline} {...props} />
        : <code className={config.codeBlock} {...props} />,
    pre: ({node, ...props}) => <pre className={config.pre} {...props} />,
    a: ({node, ...props}) => <a className={config.a} {...props} />,
    strong: ({node, ...props}) => <strong className={config.strong} {...props} />,
    em: ({node, ...props}) => <em className={config.em} {...props} />,
    hr: ({node, ...props}) => <hr className={config.hr} {...props} />,
    table: ({node, ...props}) => <table className={config.table} {...props} />,
    thead: ({node, ...props}) => <thead className={config.thead} {...props} />,
    tbody: ({node, ...props}) => <tbody className={config.tbody} {...props} />,
    tr: ({node, ...props}) => <tr className={config.tr} {...props} />,
    th: ({node, ...props}) => <th className={config.th} {...props} />,
    td: ({node, ...props}) => <td className={config.td} {...props} />,
  };

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={components}
        {...props}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export { MarkdownRenderer };