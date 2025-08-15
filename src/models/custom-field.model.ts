export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'url' | 'date' | 'select' | 'boolean' | 'textarea' | 'rating';
  isPrivate: boolean;
  isRequired: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}
