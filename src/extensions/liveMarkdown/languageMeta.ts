export interface LanguageMeta {
  name: string;
  color: string;
  bg: string;
}

export function getLanguageMeta(rawLang: string): LanguageMeta {
  const lang = (rawLang || '').split('|')[0].trim().toLowerCase();
  switch (lang) {
    case 'ts':
    case 'typescript':
      return { name: 'TypeScript', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'js':
    case 'javascript':
    case 'jsx':
      return { name: 'JavaScript', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'tsx':
      return { name: 'TSX', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'py':
    case 'python':
      return { name: 'Python', color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)' };
    case 'json':
      return { name: 'JSON', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    case 'html':
      return { name: 'HTML', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' };
    case 'css':
    case 'scss':
    case 'sass':
      return { name: 'CSS', color: '#818CF8', bg: 'rgba(129, 140, 248, 0.15)' };
    case 'sql':
      return { name: 'SQL', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)' };
    case 'sh':
    case 'bash':
    case 'shell':
    case 'zsh':
      return { name: 'Bash', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    case 'md':
    case 'markdown':
      return { 
        name: 'Markdown', 
        color: 'var(--accent-primary, #007ACC)', 
        bg: 'color-mix(in srgb, var(--accent-primary, #007ACC) 14%, transparent)' 
      };
    case 'mermaid':
      return { name: 'Mermaid Diagram', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' };
    case 'latex':
    case 'math':
    case 'katex':
    case 'mathjax':
    case 'tex':
    case 'amsmath':
      return { name: 'LaTeX Math', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.15)' };
    case 'rs':
    case 'rust':
      return { name: 'Rust', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' };
    case 'go':
    case 'golang':
      return { name: 'Go', color: '#22D3EE', bg: 'rgba(34, 211, 238, 0.15)' };
    case 'cpp':
    case 'c++':
    case 'c':
      return { name: 'C / C++', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' };
    case 'yaml':
    case 'yml':
      return { name: 'YAML', color: '#F87171', bg: 'rgba(248, 113, 113, 0.15)' };
    case 'xml':
      return { name: 'XML', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'dockerfile':
    case 'docker':
      return { name: 'Docker', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'cntxt':
      return { 
        name: 'CNTXT', 
        color: 'var(--accent-primary, #007ACC)', 
        bg: 'color-mix(in srgb, var(--accent-primary, #007ACC) 14%, transparent)' 
      };
    case 'deliverable':
      return { 
        name: 'Deliverable', 
        color: 'var(--accent-primary, #007ACC)', 
        bg: 'color-mix(in srgb, var(--accent-primary, #007ACC) 14%, transparent)' 
      };
    case 'agent':
      return { 
        name: 'Agent', 
        color: 'var(--accent-primary, #007ACC)', 
        bg: 'color-mix(in srgb, var(--accent-primary, #007ACC) 14%, transparent)' 
      };
    default:
      return { 
        name: lang ? lang.toUpperCase() : 'Code', 
        color: '#A1A1AA', 
        bg: 'rgba(161, 161, 170, 0.15)' 
      };
  }
}
