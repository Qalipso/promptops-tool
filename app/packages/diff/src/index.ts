export {
  type DiffLine,
  type CollapsedLine,
  diffLines,
  collapseEqual,
  hasChanges,
  diffStats,
} from './lines.js';

export {
  type PromptBody,
  type FieldDiff,
  type JsonChange,
  type JsonChangeKind,
  diffPromptBody,
  diffObject,
  jsonEqual,
} from './structured.js';
