export interface NavigationNodeRow {
  id: string;
  jurisdiction: string;
  doc_type: string;
  path: string;
  parent_path: string | null;
  segment: string;
  label: string;
  sort_key: string;
  depth: number;
  provision_id: string | null;
  citation_path: string | null;
  has_children: boolean;
  child_count: number;
  has_rulespec: boolean;
  encoded_descendant_count: number;
  status: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NavigationIndexChildrenParams {
  jurisdiction: string;
  docType: string;
  parentPath: string | null;
  encodedOnly: boolean;
  page: number;
}

export interface NavigationIndexChildrenResult {
  rows: NavigationNodeRow[];
  hasMore: boolean;
  total: number;
}

export interface NavigationDocTypeResult {
  docTypes: string[];
}

export interface NavigationIndexPrefixRowsParams {
  jurisdiction: string;
  docType: string;
  pathPrefix: string;
  encodedOnly: boolean;
}
