import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage, t, availableLanguages } = useLanguage();

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  };

  const getLanguageLabel = (code: string) => {
    const key = `languages.${code}`;
    const label = t(key);
    return label === key ? code.toUpperCase() : label;
  };

  return (
    <Select value={language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="min-w-[140px] justify-start gap-2">
        <Languages className="h-4 w-4" aria-hidden />
        <SelectValue placeholder={t('languageSwitcher.placeholder')} />
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