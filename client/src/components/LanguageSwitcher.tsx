import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage, t, availableLanguages } = useLanguage();

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  };

  const getLanguageLabel = (code: string) => {
    // Map language codes to their full names
    const languageNames: Record<string, string> = {
      'en': 'english',
      'ar': 'arabic',
      'fr': 'french'
    };

    const languageKey = languageNames[code] || code;
    const key = `languages.${languageKey}`;
    const label = t(key);
    return label === key ? code.toUpperCase() : label;
  };

  return (
    <Select value={language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-8 h-8 p-0 border-0 bg-transparent hover:bg-gray-100 rounded-lg">
        <Languages className="h-4 w-4" aria-hidden />
      </SelectTrigger>
      <SelectContent>
        {availableLanguages.map((code) => (
          <SelectItem key={code} value={code}>
            {getLanguageLabel(code)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
